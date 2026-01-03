//! VoiceMark Transcription Sidecar
//!
//! HTTP server providing speech-to-text transcription using whisper.cpp.
//!
//! ## Endpoints
//!
//! - `GET /health` - Health check
//! - `POST /transcribe` - Transcribe audio (multipart form, field: `file`)
//!
//! ## Usage
//!
//! ```bash
//! # Start the server
//! RUST_LOG=info cargo run
//!
//! # Health check
//! curl http://localhost:3001/health
//!
//! # Transcribe audio
//! curl -X POST -F "file=@audio.webm" http://localhost:3001/transcribe
//! ```

mod audio;
mod transcribe;

use anyhow::{Context, Result};
use axum::{
    Json,
    Router,
    extract::Multipart,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{error, info, instrument};

/// Default port for the sidecar server.
const DEFAULT_PORT: u16 = 3001;

/// Health check response.
#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    model_loaded: bool,
}

/// Transcription response.
#[derive(Serialize)]
struct TranscribeResponse {
    text: String,
    segments: usize,
}

/// Error response.
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

/// Health check endpoint.
///
/// Returns `{ "ok": true, "model_loaded": true/false }`
async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        model_loaded: transcribe::is_model_loaded(),
    })
}

/// Transcription endpoint.
///
/// Accepts multipart form data with a `file` field containing audio.
/// Returns `{ "text": "...", "segments": N }`
#[instrument(skip(multipart))]
async fn transcribe_audio(mut multipart: Multipart) -> impl IntoResponse {
    // Extract the audio file from multipart form
    let audio_bytes = match extract_audio_file(&mut multipart).await {
        Ok(bytes) => bytes,
        Err(e) => {
            error!("Failed to extract audio file: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e.to_string() })),
            );
        }
    };

    info!(bytes = audio_bytes.len(), "Received audio for transcription");

    // Convert to WAV
    let wav_file = match audio::convert_to_wav(&audio_bytes) {
        Ok(file) => file,
        Err(e) => {
            error!("Audio conversion failed: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Audio conversion failed: {}", e) })),
            );
        }
    };

    // Read WAV samples
    let samples = match audio::read_wav_samples(wav_file.path()) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to read WAV samples: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Failed to read audio: {}", e) })),
            );
        }
    };

    // Transcribe
    let result = match transcribe::transcribe(&samples, transcribe::TranscribeOptions::default()) {
        Ok(r) => r,
        Err(e) => {
            error!("Transcription failed: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Transcription failed: {}", e) })),
            );
        }
    };

    info!(
        text_len = result.text.len(),
        segments = result.segments,
        "Transcription successful"
    );

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "text": result.text,
            "segments": result.segments
        })),
    )
}

/// Extract audio file bytes from multipart form.
async fn extract_audio_file(multipart: &mut Multipart) -> Result<Vec<u8>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .context("Failed to get next field")?
    {
        let name = field.name().unwrap_or_default().to_string();

        if name == "file" {
            let bytes = field.bytes().await.context("Failed to read file bytes")?;
            return Ok(bytes.to_vec());
        }
    }

    anyhow::bail!("No 'file' field found in multipart form")
}

/// Build the application router.
fn build_router() -> Router {
    // Configure CORS for development (allow all origins)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/transcribe", post(transcribe_audio))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("voicemark_sidecar=info".parse().unwrap()),
        )
        .init();

    info!("VoiceMark Transcription Sidecar starting...");

    // Get model path from environment or use default
    let model_path = env::var("VOICEMARK_MODEL_PATH").ok();

    // Initialize the Whisper model
    transcribe::init_model(model_path.as_deref())?;

    // Get port from environment or use default
    let port: u16 = env::var("VOICEMARK_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!("Server listening on http://{}", addr);

    // Build and run the server
    let app = build_router();
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_endpoint() {
        let app = build_router();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
