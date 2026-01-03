# VoiceMark Sidecar

Rust HTTP server providing speech-to-text transcription using [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

## Quick Start

### 1. Download the Whisper model

```bash
# From the project root:
pnpm sidecar:download-model

# Or manually:
curl -L -o models/ggml-base.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

### 2. Build and run

```bash
cargo run
```

The server starts on `http://localhost:3001`.

### 3. Test it

```bash
# Health check
curl http://localhost:3001/health

# Transcribe audio
curl -X POST -F "file=@recording.webm" http://localhost:3001/transcribe
```

## API

### GET /health

Returns server status.

```json
{ "ok": true, "model_loaded": true }
```

### POST /transcribe

Transcribe an audio file.

**Request:** `multipart/form-data` with `file` field containing audio.

**Response:**
```json
{ "text": "Hello world", "segments": 1 }
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `VOICEMARK_PORT` | `3001` | Server port |
| `VOICEMARK_MODEL_PATH` | `./models/ggml-base.en.bin` | Path to Whisper model |
| `RUST_LOG` | `info` | Log level |

## Development

```bash
# Run tests
cargo test

# Build release
cargo build --release

# Run with debug logging
RUST_LOG=debug cargo run
```

## Requirements

- **Rust 1.70+**
- **ffmpeg** (for audio conversion)
  ```bash
  # Ubuntu/Debian
  sudo apt install ffmpeg
  
  # macOS
  brew install ffmpeg
  ```

## Architecture

```
sidecar/
├── Cargo.toml          # Dependencies
├── src/
│   ├── main.rs         # HTTP server (axum)
│   ├── audio.rs        # ffmpeg audio conversion
│   └── transcribe.rs   # whisper-rs wrapper
├── models/             # Whisper models (not committed)
└── resources/          # Bundled binaries (for release)
```

## Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `ggml-tiny.en.bin` | 75 MB | Fastest | Lower |
| `ggml-base.en.bin` | 142 MB | Fast | Good |
| `ggml-small.en.bin` | 466 MB | Medium | Better |
| `ggml-medium.en.bin` | 1.5 GB | Slow | Best |

For development, use `tiny.en`. For production, use `base.en` or `small.en`.
