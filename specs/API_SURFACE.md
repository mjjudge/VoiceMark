# API Surface

## Sidecar HTTP API (voicemark-sidecar)

The Rust sidecar provides HTTP and WebSocket APIs for transcription:

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/transcribe` | Batch transcribe audio |
| GET | `/stream` | WebSocket streaming transcription |

### GET /health

Returns sidecar status.

**Response:**
```json
{
  "ok": true,
  "model_loaded": true
}
```

### POST /transcribe

Transcribe an audio file (batch mode).

**Request:** `multipart/form-data`
- `file`: Audio blob (WebM/Opus, WAV, etc.)

**Response:**
```json
{
  "text": "Hello world",
  "segments": 1
}
```

**Error response:**
```json
{
  "error": "Model not loaded"
}
```

### GET /stream (WebSocket)

Real-time streaming transcription via WebSocket.

**Protocol:**
- Client sends binary PCM audio frames (16kHz, mono, Int16 little-endian)
- Client sends JSON control messages:
  ```json
  { "type": "stop" }
  ```
- Server sends JSON transcription messages:
  ```json
  { "type": "partial", "text": "hello wor" }
  { "type": "final", "text": "Hello world." }
  ```

**Design:**
- Audio is buffered in 6-second chunks
- Each chunk is transcribed as a final when complete
- Partial transcriptions sent every ~500ms during dictation
- Transcription runs on blocking thread pool to avoid blocking async runtime

**Client implementation:** `src/asr/streamingAsr.ts`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VOICEMARK_PORT` | `3001` | Server port |
| `VOICEMARK_MODEL_PATH` | `./models/ggml-small.en.bin` | Whisper model path |
| `RUST_LOG` | - | Logging level (e.g., `info`, `debug`) |

## Proposed Tauri commands (future)

### Transcription
- `transcribe_file(path, opts) -> { text, segments }`
- `transcribe_buffer(bytes_base64, opts) -> { text, segments }`
- `list_models() -> [ModelInfo]`
- `download_model(model_id) -> ProgressHandle`
- `set_active_model(model_id)`

### Editor / operations
- `apply_op(op: Op) -> ApplyResult`
- `apply_ops(ops: [Op]) -> ApplyResult`
- `undo() -> ApplyResult`
- `redo() -> ApplyResult`
- `get_document() -> { markdown, version }`
- `set_document(markdown) -> { version }`

### Settings
- `get_settings() -> Settings`
- `set_settings(settings_patch) -> Settings`
  - includes `locale` (`en-GB`/`en-US`) and `enable_us_aliases`

## Events
- `transcription:progress`
- `transcription:result`
- `model:download_progress`
- `editor:changed` (versioned updates)
- `toast` (user-facing notifications, e.g., “Couldn’t find 'budget'”)

## Types (sketch)
See `docs/technical/VOICE_COMMANDS.md` for `Op`, `Style`, `Scope`, etc.
