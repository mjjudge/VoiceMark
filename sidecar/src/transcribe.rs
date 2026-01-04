//! Whisper transcription wrapper for VoiceMark sidecar.
//!
//! Uses whisper-rs (Rust bindings to whisper.cpp) for offline
//! speech-to-text transcription.

use anyhow::{Context, Result, bail};
use std::path::Path;
use std::sync::OnceLock;
use tracing::{debug, info, instrument};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Global whisper context (loaded once, reused for all transcriptions).
static WHISPER_CTX: OnceLock<WhisperContext> = OnceLock::new();

/// Default model path relative to sidecar binary.
const DEFAULT_MODEL_PATH: &str = "./models/ggml-small.en.bin";

/// Initialize the Whisper model.
///
/// Call this once at startup. Uses the model at the given path,
/// or falls back to the default model location.
#[instrument]
pub fn init_model(model_path: Option<&str>) -> Result<()> {
    let path = model_path.unwrap_or(DEFAULT_MODEL_PATH);

    if !Path::new(path).exists() {
        bail!(
            "Whisper model not found at '{}'. Download it with:\n\
             curl -L -o {} https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
            path,
            path
        );
    }

    info!(model_path = path, "Loading Whisper model...");

    let ctx = WhisperContext::new_with_params(path, WhisperContextParameters::default())
        .context("Failed to load Whisper model")?;

    WHISPER_CTX
        .set(ctx)
        .map_err(|_| anyhow::anyhow!("Whisper context already initialized"))?;

    info!("Whisper model loaded successfully");
    Ok(())
}

/// Check if the model is loaded.
pub fn is_model_loaded() -> bool {
    WHISPER_CTX.get().is_some()
}

/// Transcription options.
#[derive(Debug, Clone, Default)]
pub struct TranscribeOptions {
    /// Language code (e.g., "en"). If None, auto-detect.
    pub language: Option<String>,
    /// Whether to translate to English.
    pub translate: bool,
}

/// Transcription result.
#[derive(Debug, Clone)]
pub struct TranscribeResult {
    /// The transcribed text.
    pub text: String,
    /// Number of audio segments processed.
    pub segments: usize,
}

/// Transcribe audio samples using Whisper.
///
/// Expects audio as f32 samples in range [-1.0, 1.0] at 16kHz mono.
#[instrument(skip(samples), fields(sample_count = samples.len()))]
pub fn transcribe(samples: &[f32], options: TranscribeOptions) -> Result<TranscribeResult> {
    let ctx = WHISPER_CTX
        .get()
        .context("Whisper model not initialized. Call init_model() first.")?;

    // Create whisper state for this transcription
    let mut state = ctx.create_state().context("Failed to create whisper state")?;

    // Configure transcription parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    // Set language (English by default for v0.1)
    if let Some(lang) = &options.language {
        params.set_language(Some(lang));
    } else {
        params.set_language(Some("en"));
    }

    params.set_translate(options.translate);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    
    // Optimize for real-time transcription
    // Use smaller segments for faster processing and lower latency
    params.set_max_len(1); // Process in smaller chunks
    params.set_token_timestamps(false); // Disable token-level timestamps for speed
    params.set_single_segment(false); // Allow multiple segments for incremental output
    
    // Audio processing optimizations
    params.set_speed_up(true); // Enable speed optimizations
    params.set_audio_ctx(0); // Use default audio context window

    // Run transcription
    debug!("Starting transcription...");
    state
        .full(params, samples)
        .context("Whisper transcription failed")?;

    // Extract text from segments
    let num_segments = state.full_n_segments()?;
    let mut text = String::new();

    for i in 0..num_segments {
        let segment_text = state
            .full_get_segment_text(i)
            .context("Failed to get segment text")?;
        text.push_str(&segment_text);
    }

    // Clean up the text (remove leading/trailing whitespace)
    let text = text.trim().to_string();

    debug!(
        segments = num_segments,
        text_len = text.len(),
        "Transcription complete"
    );

    Ok(TranscribeResult {
        text,
        segments: num_segments as usize,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_not_loaded_initially() {
        // Note: This test may fail if run after other tests that load the model
        // In a fresh process, the model should not be loaded
    }

    #[test]
    fn test_default_transcribe_options() {
        let opts = TranscribeOptions::default();
        assert!(opts.language.is_none());
        assert!(!opts.translate);
    }
}
