//! WebSocket streaming transcription for VoiceMark.
//!
//! Provides real-time transcription via WebSocket connection.
//! Audio is sent as base64-encoded PCM chunks, partial results
//! are returned as transcription progresses.

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tracing::{debug, error, info, instrument, warn};

use crate::transcribe::{self, TranscribeOptions};

/// Configuration for streaming transcription
const SAMPLE_RATE: u32 = 16000;
/// Chunk size before auto-commit (6 seconds of audio)
const CHUNK_SECONDS: f32 = 6.0;
const CHUNK_SAMPLES: usize = (SAMPLE_RATE as f32 * CHUNK_SECONDS) as usize;
/// Minimum interval between transcriptions (throttle to avoid overload)
const MIN_TRANSCRIBE_INTERVAL_MS: u128 = 500;

/// Incoming WebSocket message types
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ClientMessage {
    /// Audio chunk as base64-encoded 16-bit PCM
    Audio {
        /// Base64-encoded audio data (16-bit PCM, 16kHz mono)
        data: String,
        /// Sample rate (should be 16000)
        #[serde(default = "default_sample_rate")]
        sample_rate: u32,
    },
    /// End of audio stream
    End,
    /// Reset/clear the audio buffer
    Reset,
}

fn default_sample_rate() -> u32 {
    16000
}

/// Outgoing WebSocket message types
#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ServerMessage {
    /// Partial transcription result (may change)
    Partial {
        text: String,
        #[serde(rename = "ts")]
        timestamp: u64,
    },
    /// Final transcription result (committed)
    Final {
        text: String,
        #[serde(rename = "ts")]
        timestamp: u64,
    },
    /// Error message
    Error { message: String },
    /// Acknowledgment of connection/reset
    Ready { message: String },
}

/// State for a streaming transcription session
struct StreamingSession {
    /// Current audio chunk being accumulated (f32, 16kHz mono)
    current_chunk: Vec<f32>,
    /// Last time we ran transcription (for throttling)
    last_transcribe_time: Option<Instant>,
    /// Whether a transcription is currently in progress
    transcription_pending: bool,
}

impl StreamingSession {
    fn new() -> Self {
        Self {
            current_chunk: Vec::with_capacity(CHUNK_SAMPLES),
            last_transcribe_time: None,
            transcription_pending: false,
        }
    }

    fn reset(&mut self) {
        self.current_chunk.clear();
        self.last_transcribe_time = None;
        self.transcription_pending = false;
    }

    /// Add audio samples to the current chunk
    /// Returns true if chunk is ready for auto-commit
    fn add_samples(&mut self, samples: &[f32]) -> bool {
        self.current_chunk.extend_from_slice(samples);
        self.current_chunk.len() >= CHUNK_SAMPLES
    }

    /// Check if enough time has passed to transcribe again
    fn should_transcribe(&self) -> bool {
        if self.transcription_pending {
            return false;
        }
        match self.last_transcribe_time {
            None => true,
            Some(last) => last.elapsed().as_millis() >= MIN_TRANSCRIBE_INTERVAL_MS,
        }
    }

    /// Get a clone of the current chunk for transcription
    fn get_chunk_clone(&self) -> Vec<f32> {
        self.current_chunk.clone()
    }

    /// Clear the current chunk after commit
    fn clear_chunk(&mut self) {
        self.current_chunk.clear();
    }

    /// Check if chunk has enough audio for meaningful transcription (at least 0.5s)
    fn has_meaningful_audio(&self) -> bool {
        self.current_chunk.len() >= (SAMPLE_RATE / 2) as usize
    }
}

/// Convert base64-encoded 16-bit PCM to f32 samples
fn decode_audio(base64_data: &str) -> Result<Vec<f32>, anyhow::Error> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD.decode(base64_data)?;

    // Convert 16-bit little-endian PCM to f32
    if bytes.len() % 2 != 0 {
        anyhow::bail!("Invalid audio data length: must be multiple of 2");
    }

    let samples: Vec<f32> = bytes
        .chunks_exact(2)
        .map(|chunk| {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
            sample as f32 / 32768.0
        })
        .collect();

    Ok(samples)
}

/// WebSocket upgrade handler
pub async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

/// Handle a WebSocket connection
#[instrument(skip(socket))]
async fn handle_socket(socket: WebSocket) {
    info!("New streaming connection established");

    let (mut sender, mut receiver) = socket.split();
    let session = Arc::new(Mutex::new(StreamingSession::new()));

    // Send ready message
    let ready_msg = ServerMessage::Ready {
        message: "Streaming transcription ready".to_string(),
    };
    if let Ok(json) = serde_json::to_string(&ready_msg) {
        let _ = sender.send(Message::Text(json.into())).await;
    }

    // Process incoming messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(client_msg) => {
                        let response = handle_client_message(client_msg, &session).await;
                        if let Some(server_msg) = response {
                            if let Ok(json) = serde_json::to_string(&server_msg) {
                                if sender.send(Message::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Failed to parse client message: {}", e);
                        let error_msg = ServerMessage::Error {
                            message: format!("Invalid message format: {}", e),
                        };
                        if let Ok(json) = serde_json::to_string(&error_msg) {
                            let _ = sender.send(Message::Text(json.into())).await;
                        }
                    }
                }
            }
            Ok(Message::Binary(data)) => {
                // Handle raw binary audio (16-bit PCM)
                if data.len() % 2 == 0 {
                    let samples: Vec<f32> = data
                        .chunks_exact(2)
                        .map(|chunk| {
                            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                            sample as f32 / 32768.0
                        })
                        .collect();

                    let mut session_guard = session.lock().await;
                    let chunk_ready = session_guard.add_samples(&samples);
                    debug!("Added {} samples, chunk_ready={}", samples.len(), chunk_ready);

                    // If chunk is full, auto-commit it as final
                    if chunk_ready {
                        session_guard.transcription_pending = true;
                        let audio_data = session_guard.get_chunk_clone();
                        session_guard.clear_chunk(); // Clear for next chunk
                        drop(session_guard);

                        info!("Auto-committing chunk ({} samples)", audio_data.len());

                        // Run transcription in a blocking thread
                        let transcribe_result = tokio::task::spawn_blocking(move || {
                            let options = TranscribeOptions {
                                language: Some("en".to_string()),
                                translate: false,
                            };
                            transcribe::transcribe(&audio_data, options)
                        })
                        .await;

                        // Update session state
                        let mut session_guard = session.lock().await;
                        session_guard.transcription_pending = false;
                        session_guard.last_transcribe_time = Some(Instant::now());
                        drop(session_guard);

                        // Send as FINAL (committed chunk)
                        match transcribe_result {
                            Ok(Ok(result)) => {
                                let final_msg = ServerMessage::Final {
                                    text: result.text,
                                    timestamp: now_millis(),
                                };
                                if let Ok(json) = serde_json::to_string(&final_msg) {
                                    if sender.send(Message::Text(json.into())).await.is_err() {
                                        break;
                                    }
                                }
                            }
                            Ok(Err(e)) => {
                                error!("Transcription error: {}", e);
                            }
                            Err(e) => {
                                error!("Spawn blocking error: {}", e);
                            }
                        }
                    }
                    // Otherwise, send partial if throttle allows
                    else if session_guard.should_transcribe() && session_guard.has_meaningful_audio() {
                        session_guard.transcription_pending = true;
                        let audio_data = session_guard.get_chunk_clone();
                        drop(session_guard);

                        // Run transcription in a blocking thread
                        let transcribe_result = tokio::task::spawn_blocking(move || {
                            let options = TranscribeOptions {
                                language: Some("en".to_string()),
                                translate: false,
                            };
                            transcribe::transcribe(&audio_data, options)
                        })
                        .await;

                        // Update session state and send result
                        let mut session_guard = session.lock().await;
                        session_guard.transcription_pending = false;
                        session_guard.last_transcribe_time = Some(Instant::now());
                        drop(session_guard);

                        match transcribe_result {
                            Ok(Ok(result)) => {
                                let partial_msg = ServerMessage::Partial {
                                    text: result.text,
                                    timestamp: now_millis(),
                                };
                                if let Ok(json) = serde_json::to_string(&partial_msg) {
                                    if sender.send(Message::Text(json.into())).await.is_err() {
                                        break;
                                    }
                                }
                            }
                            Ok(Err(e)) => {
                                error!("Transcription error: {}", e);
                            }
                            Err(e) => {
                                error!("Spawn blocking error: {}", e);
                            }
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("Client closed connection");
                break;
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    info!("Streaming connection closed");
}

/// Handle a parsed client message
async fn handle_client_message(
    msg: ClientMessage,
    session: &Arc<Mutex<StreamingSession>>,
) -> Option<ServerMessage> {
    match msg {
        ClientMessage::Audio { data, sample_rate } => {
            if sample_rate != SAMPLE_RATE {
                return Some(ServerMessage::Error {
                    message: format!(
                        "Expected sample rate {}, got {}",
                        SAMPLE_RATE, sample_rate
                    ),
                });
            }

            match decode_audio(&data) {
                Ok(samples) => {
                    let mut session_guard = session.lock().await;
                    let chunk_ready = session_guard.add_samples(&samples);
                    debug!("Added {} samples from JSON message", samples.len());

                    // If chunk is full, auto-commit
                    if chunk_ready {
                        session_guard.transcription_pending = true;
                        let audio_data = session_guard.get_chunk_clone();
                        session_guard.clear_chunk();
                        drop(session_guard);

                        let transcribe_result = tokio::task::spawn_blocking(move || {
                            let options = TranscribeOptions {
                                language: Some("en".to_string()),
                                translate: false,
                            };
                            transcribe::transcribe(&audio_data, options)
                        })
                        .await;

                        let mut session_guard = session.lock().await;
                        session_guard.transcription_pending = false;
                        session_guard.last_transcribe_time = Some(Instant::now());
                        drop(session_guard);

                        match transcribe_result {
                            Ok(Ok(result)) => Some(ServerMessage::Final {
                                text: result.text,
                                timestamp: now_millis(),
                            }),
                            Ok(Err(e)) => Some(ServerMessage::Error {
                                message: format!("Transcription failed: {}", e),
                            }),
                            Err(e) => Some(ServerMessage::Error {
                                message: format!("Spawn blocking failed: {}", e),
                            }),
                        }
                    }
                    // Otherwise send partial if throttle allows
                    else if session_guard.should_transcribe() && session_guard.has_meaningful_audio() {
                        session_guard.transcription_pending = true;
                        let audio_data = session_guard.get_chunk_clone();
                        drop(session_guard);

                        let transcribe_result = tokio::task::spawn_blocking(move || {
                            let options = TranscribeOptions {
                                language: Some("en".to_string()),
                                translate: false,
                            };
                            transcribe::transcribe(&audio_data, options)
                        })
                        .await;

                        let mut session_guard = session.lock().await;
                        session_guard.transcription_pending = false;
                        session_guard.last_transcribe_time = Some(Instant::now());
                        drop(session_guard);

                        match transcribe_result {
                            Ok(Ok(result)) => Some(ServerMessage::Partial {
                                text: result.text,
                                timestamp: now_millis(),
                            }),
                            Ok(Err(e)) => Some(ServerMessage::Error {
                                message: format!("Transcription failed: {}", e),
                            }),
                            Err(e) => Some(ServerMessage::Error {
                                message: format!("Spawn blocking failed: {}", e),
                            }),
                        }
                    } else {
                        None // Throttled, no response
                    }
                }
                Err(e) => Some(ServerMessage::Error {
                    message: format!("Failed to decode audio: {}", e),
                }),
            }
        }
        ClientMessage::End => {
            let mut session_guard = session.lock().await;
            let audio_data = session_guard.get_chunk_clone();
            session_guard.reset();
            drop(session_guard);

            if audio_data.is_empty() {
                return Some(ServerMessage::Final {
                    text: String::new(),
                    timestamp: now_millis(),
                });
            }

            // Run final transcription in a blocking thread
            let transcribe_result = tokio::task::spawn_blocking(move || {
                let options = TranscribeOptions {
                    language: Some("en".to_string()),
                    translate: false,
                };
                transcribe::transcribe(&audio_data, options)
            })
            .await;

            // Reset session
            let mut session_guard = session.lock().await;
            session_guard.reset();
            drop(session_guard);

            match transcribe_result {
                Ok(Ok(result)) => Some(ServerMessage::Final {
                    text: result.text,
                    timestamp: now_millis(),
                }),
                Ok(Err(e)) => Some(ServerMessage::Error {
                    message: format!("Finalization failed: {}", e),
                }),
                Err(e) => Some(ServerMessage::Error {
                    message: format!("Spawn blocking failed: {}", e),
                }),
            }
        }
        ClientMessage::Reset => {
            let mut session_guard = session.lock().await;
            session_guard.reset();
            Some(ServerMessage::Ready {
                message: "Session reset".to_string(),
            })
        }
    }
}

/// Get current timestamp in milliseconds
fn now_millis() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_audio() {
        // Test with known values: two 16-bit samples
        // Sample 1: 0x0000 (0) -> 0.0
        // Sample 2: 0x7FFF (32767) -> ~1.0
        let data = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &[0x00, 0x00, 0xFF, 0x7F],
        );
        let samples = decode_audio(&data).unwrap();
        assert_eq!(samples.len(), 2);
        assert!((samples[0] - 0.0).abs() < 0.001);
        assert!((samples[1] - 0.99997).abs() < 0.001);
    }

    #[test]
    fn test_streaming_session_chunk_ready() {
        let mut session = StreamingSession::new();

        // Add samples less than chunk size - should return false
        let small_samples = vec![0.5f32; CHUNK_SAMPLES / 2];
        assert!(!session.add_samples(&small_samples));

        // Add more to exceed chunk size - should return true
        let more_samples = vec![0.5f32; CHUNK_SAMPLES];
        assert!(session.add_samples(&more_samples));
    }

    #[test]
    fn test_streaming_session_clear_chunk() {
        let mut session = StreamingSession::new();
        session.add_samples(&vec![0.5f32; 1000]);
        assert!(!session.current_chunk.is_empty());
        
        session.clear_chunk();
        assert!(session.current_chunk.is_empty());
    }

    #[test]
    fn test_client_message_parsing() {
        let json = r#"{"type":"audio","data":"AAAA","sample_rate":16000}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        match msg {
            ClientMessage::Audio { data, sample_rate } => {
                assert_eq!(data, "AAAA");
                assert_eq!(sample_rate, 16000);
            }
            _ => panic!("Expected Audio message"),
        }

        let json = r#"{"type":"end"}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        assert!(matches!(msg, ClientMessage::End));

        let json = r#"{"type":"reset"}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        assert!(matches!(msg, ClientMessage::Reset));
    }

    #[test]
    fn test_server_message_serialization() {
        let msg = ServerMessage::Partial {
            text: "hello".to_string(),
            timestamp: 12345,
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"partial\""));
        assert!(json.contains("\"text\":\"hello\""));
        assert!(json.contains("\"ts\":12345"));
    }
}
