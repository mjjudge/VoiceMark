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
use tokio::sync::Mutex;
use tracing::{debug, error, info, instrument, warn};

use crate::transcribe::{self, TranscribeOptions, TranscribeResult};

/// Configuration for streaming transcription
const SAMPLE_RATE: u32 = 16000;
const SLIDING_WINDOW_SECONDS: f32 = 15.0;
const MAX_SAMPLES: usize = (SAMPLE_RATE as f32 * SLIDING_WINDOW_SECONDS) as usize;

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
    /// Accumulated audio samples (f32, 16kHz mono)
    audio_buffer: Vec<f32>,
    /// Last transcription result (for diffing)
    last_text: String,
    /// Number of samples that have been "committed" (finalized)
    committed_samples: usize,
}

impl StreamingSession {
    fn new() -> Self {
        Self {
            audio_buffer: Vec::with_capacity(MAX_SAMPLES),
            last_text: String::new(),
            committed_samples: 0,
        }
    }

    fn reset(&mut self) {
        self.audio_buffer.clear();
        self.last_text.clear();
        self.committed_samples = 0;
    }

    /// Add audio samples to the buffer
    fn add_samples(&mut self, samples: &[f32]) {
        self.audio_buffer.extend_from_slice(samples);

        // If buffer exceeds max, trim from the start (but keep committed portion info)
        if self.audio_buffer.len() > MAX_SAMPLES {
            let excess = self.audio_buffer.len() - MAX_SAMPLES;
            self.audio_buffer.drain(0..excess);
            // Adjust committed_samples if we've trimmed past it
            self.committed_samples = self.committed_samples.saturating_sub(excess);
        }
    }

    /// Transcribe the current buffer and return new text
    fn transcribe(&mut self) -> Result<Option<TranscribeResult>, anyhow::Error> {
        if self.audio_buffer.is_empty() {
            return Ok(None);
        }

        let options = TranscribeOptions {
            language: Some("en".to_string()),
            translate: false,
        };

        let result = transcribe::transcribe(&self.audio_buffer, options)?;
        Ok(Some(result))
    }

    /// Finalize transcription and return the final text
    fn finalize(&mut self) -> Result<Option<TranscribeResult>, anyhow::Error> {
        let result = self.transcribe()?;
        self.reset();
        Ok(result)
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

                    let mut session = session.lock().await;
                    session.add_samples(&samples);
                    debug!("Added {} samples from binary message", samples.len());

                    // Transcribe and send partial
                    match session.transcribe() {
                        Ok(Some(result)) => {
                            let partial_msg = ServerMessage::Partial {
                                text: result.text,
                                timestamp: now_millis(),
                            };
                            drop(session); // Release lock before sending
                            if let Ok(json) = serde_json::to_string(&partial_msg) {
                                if sender.send(Message::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Ok(None) => {}
                        Err(e) => {
                            error!("Transcription error: {}", e);
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
                    let mut session = session.lock().await;
                    session.add_samples(&samples);
                    debug!("Added {} samples", samples.len());

                    // Transcribe and return partial
                    match session.transcribe() {
                        Ok(Some(result)) => Some(ServerMessage::Partial {
                            text: result.text,
                            timestamp: now_millis(),
                        }),
                        Ok(None) => None,
                        Err(e) => Some(ServerMessage::Error {
                            message: format!("Transcription failed: {}", e),
                        }),
                    }
                }
                Err(e) => Some(ServerMessage::Error {
                    message: format!("Failed to decode audio: {}", e),
                }),
            }
        }
        ClientMessage::End => {
            let mut session = session.lock().await;
            match session.finalize() {
                Ok(Some(result)) => Some(ServerMessage::Final {
                    text: result.text,
                    timestamp: now_millis(),
                }),
                Ok(None) => Some(ServerMessage::Final {
                    text: String::new(),
                    timestamp: now_millis(),
                }),
                Err(e) => Some(ServerMessage::Error {
                    message: format!("Finalization failed: {}", e),
                }),
            }
        }
        ClientMessage::Reset => {
            let mut session = session.lock().await;
            session.reset();
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
    fn test_streaming_session_buffer_limit() {
        let mut session = StreamingSession::new();

        // Add more samples than MAX_SAMPLES
        let samples = vec![0.5f32; MAX_SAMPLES + 1000];
        session.add_samples(&samples);

        // Buffer should be limited to MAX_SAMPLES
        assert_eq!(session.audio_buffer.len(), MAX_SAMPLES);
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
