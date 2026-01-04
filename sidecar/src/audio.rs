//! Audio conversion utilities for VoiceMark sidecar.
//!
//! Converts WebM/Opus audio (from browser MediaRecorder) to WAV format
//! that whisper.cpp expects (16kHz, mono, 16-bit PCM).

use anyhow::{Result, Context, bail};
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use tempfile::NamedTempFile;
use tracing::{debug, instrument};

/// Path to bundled ffmpeg binary, or falls back to system ffmpeg.
pub fn ffmpeg_path() -> Result<PathBuf> {
    let exe = std::env::current_exe().context("Failed to resolve current_exe()")?;
    let base = exe
        .parent()
        .context("Failed to resolve executable directory")?;

    #[cfg(target_os = "linux")]
    let rel = "resources/ffmpeg/linux-x86_64/ffmpeg";

    #[cfg(target_os = "macos")]
    let rel = "resources/ffmpeg/darwin-x86_64/ffmpeg";

    #[cfg(target_os = "windows")]
    let rel = "resources/ffmpeg/win-x86_64/ffmpeg.exe";

    let p = base.join(rel);

    if p.exists() {
        Ok(p)
    } else {
        anyhow::bail!(
            "Bundled ffmpeg not found at {}. Run: pnpm sidecar:fetch-ffmpeg",
            p.display()
        );
    }
}

pub fn write_temp_wav(bytes: &[u8]) -> Result<NamedTempFile> {
    let f = tempfile::Builder::new()
        .suffix(".wav")
        .tempfile()
        .context("Failed to create temp wav file")?;
    std::fs::write(f.path(), bytes).context("Failed to write wav bytes")?;
    Ok(f)
}

/// Converts audio bytes (WebM/Opus) to a temporary WAV file.
///
/// Returns a NamedTempFile containing 16kHz mono 16-bit PCM WAV data.
/// The file is automatically deleted when dropped.
#[instrument(skip(input_bytes), fields(input_size = input_bytes.len()))]
pub fn convert_to_wav(input_bytes: &[u8]) -> Result<NamedTempFile> {
    // Create temporary files for input and output
    let input_file = NamedTempFile::new().context("Failed to create temp input file")?;
    let output_file = NamedTempFile::new().context("Failed to create temp output file")?;

    // Write input bytes to temp file
    std::fs::write(input_file.path(), input_bytes).context("Failed to write input audio")?;

    debug!(
        input_path = ?input_file.path(),
        output_path = ?output_file.path(),
        "Converting audio to WAV"
    );

    // Run ffmpeg to convert to 16kHz mono 16-bit PCM WAV
    let output = Command::new(ffmpeg_path()?)
        .args([
            "-y",                      // Overwrite output file
            "-i",
            input_file.path().to_str().unwrap(), // Input file
            "-ar",
            "16000",                   // 16kHz sample rate (whisper requirement)
            "-ac",
            "1",                       // Mono
            "-c:a",
            "pcm_s16le",               // 16-bit PCM
            "-f",
            "wav",                     // WAV format
            output_file.path().to_str().unwrap(),
        ])
        .output()
        .context("Failed to execute ffmpeg")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("ffmpeg conversion failed: {}", stderr);
    }

    debug!("Audio conversion successful");
    Ok(output_file)
}

/// Reads WAV file and returns audio samples as f32 in range [-1.0, 1.0].
///
/// Whisper expects audio as f32 samples normalized to [-1.0, 1.0].
#[instrument(skip_all)]
pub fn read_wav_samples(wav_path: &Path) -> Result<Vec<f32>> {
    let bytes = std::fs::read(wav_path).context("Failed to read WAV file")?;

    // Skip WAV header (44 bytes for standard WAV)
    // The data chunk starts after the header
    if bytes.len() < 44 {
        bail!("WAV file too small");
    }

    // Find the data chunk
    let data_start = find_data_chunk(&bytes)?;
    let pcm_data = &bytes[data_start..];

    // Convert 16-bit PCM samples to f32
    let samples: Vec<f32> = pcm_data
        .chunks_exact(2)
        .map(|chunk| {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
            sample as f32 / 32768.0
        })
        .collect();

    debug!(sample_count = samples.len(), "Read WAV samples");
    Ok(samples)
}

/// Find the start of the data chunk in a WAV file.
fn find_data_chunk(bytes: &[u8]) -> Result<usize> {
    // Look for "data" marker
    for i in 0..bytes.len().saturating_sub(8) {
        if &bytes[i..i + 4] == b"data" {
            // Skip "data" marker (4 bytes) and chunk size (4 bytes)
            return Ok(i + 8);
        }
    }
    bail!("Could not find data chunk in WAV file")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffmpeg_path_returns_valid_string() {
        let path = ffmpeg_path();
        assert!(!path.is_empty());
    }

    #[test]
    fn test_find_data_chunk() {
        // Minimal WAV-like data with "data" marker
        let fake_wav = b"RIFFxxxxWAVEfmt ................data\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00";
        let result = find_data_chunk(fake_wav);
        assert!(result.is_ok());
    }
}
