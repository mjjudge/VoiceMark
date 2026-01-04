# Technical Spec
## Transcription Engine (Whisper.cpp sidecar)

VoiceMark uses a **local Rust sidecar** for speech-to-text transcription.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  STREAMING MODE (default):                              ││
│  │  streamingAsr.ts → WebSocket /stream                    ││
│  │       ↓                                                 ││
│  │  AudioWorklet → PCM 16kHz → Binary WebSocket            ││
│  │                                                         ││
│  │  BATCH MODE (fallback):                                 ││
│  │  recordingAsr.ts → whisperTranscriber.ts                ││
│  │       ↓                     ↓                           ││
│  │  MediaRecorder          POST /transcribe                ││
│  │  (WebM/Opus)            (multipart form)                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
              WebSocket ws://localhost:3001/stream (streaming)
              HTTP localhost:3001/transcribe (batch)
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Sidecar (Rust + axum + whisper-rs)                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  main.rs (HTTP + WebSocket server)                      ││
│  │     ↓                                                   ││
│  │  stream.rs (WebSocket streaming transcription)          ││
│  │  audio.rs (ffmpeg: WebM→WAV for batch mode)             ││
│  │     ↓                                                   ││
│  │  transcribe.rs (whisper.cpp via whisper-rs)             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Sidecar API

**Health check:**
```
GET /health → { "ok": true, "model_loaded": true }
```

**Batch transcription:**
```
POST /transcribe
Content-Type: multipart/form-data
Field: file (audio blob)

Response: { "text": "...", "segments": N }
```

**Streaming transcription (WebSocket):**
```
WS /stream

Client → Server:
  Binary: Raw PCM audio (16-bit LE, 16kHz mono)
  JSON: { "type": "end" } to finalize
  JSON: { "type": "reset" } to clear buffer

Server → Client:
  { "type": "ready", "message": "..." }
  { "type": "partial", "text": "...", "ts": 1234567890 }
  { "type": "final", "text": "...", "ts": 1234567890 }
  { "type": "error", "message": "..." }
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| HTTP/WS server | `sidecar/src/main.rs` | axum server with /health, /transcribe, /stream |
| Streaming | `sidecar/src/stream.rs` | WebSocket handler with chunk-based transcription |
| Audio conversion | `sidecar/src/audio.rs` | ffmpeg WebM/Opus → 16kHz WAV (batch mode) |
| Transcription | `sidecar/src/transcribe.rs` | whisper-rs wrapper |

### Streaming Transcription Design

The streaming mode uses **chunk-based transcription**:

1. Audio is captured via **AudioWorklet** at 16kHz mono
2. PCM samples are sent over WebSocket as binary messages
3. Sidecar accumulates audio into **6-second chunks**
4. When a chunk is full, it's transcribed and sent as a `final` event
5. Partial results are sent every ~500ms for the current incomplete chunk
6. When recording stops, remaining audio is transcribed as a final `final`

This design ensures:
- **No audio loss** - each chunk is fully transcribed before the next starts
- **Low latency** - partials provide feedback while speaking
- **Bounded memory** - only current chunk is held in memory

### Model

Default: `small.en` model (~466 MB, ~487 MB in memory). Download to `sidecar/models/`:

```bash
cd sidecar
curl -L -o models/ggml-small.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin
```

### Running the sidecar

```bash
cd sidecar
cargo run  # Development
cargo build --release  # Production
```

See [ADR-007: Rust Sidecar](../decisions/ADR-007-rust-sidecar.md) for design rationale.

## Command Processor

After transcription, VoiceMark runs a **Command Processor** that:
1) detects prefixed command utterances,
2) compiles them into structured operations,
3) applies operations to a Markdown document buffer,
4) records ops on an undo stack.

See `docs/technical/VOICE_COMMANDS.md` for grammar and op model.
## ASR Engine Architecture

VoiceMark uses a pluggable ASR engine architecture defined by the `AsrEngine` interface (`src/asr/events.ts`):

```typescript
interface AsrEngine {
  start(onEvent: AsrEventCallback, options?: AsrStartOptions): Promise<void> | void;
  stop(): void;
}
```

### Engine implementations

| Engine | File | Purpose |
|--------|------|---------|
| **Streaming** | `src/asr/streamingAsr.ts` | Real-time WebSocket streaming (default) |
| **Recording** | `src/asr/recordingAsr.ts` | Batch mode via Web Audio API |
| **Simulated** | `src/asr/simulatedAsr.ts` | Fake transcription for testing |

### Mode selection

The active engine is selected via the `VITE_ASR_MODE` environment variable:

- **`streaming`** (default): Uses `streamingAsrEngine` - real-time WebSocket transcription
- **`real`**: Uses `recordingAsrEngine` - batch mode after stop
- **`simulated`**: Uses `simulatedAsrEngine` - emits fake transcription

See [ADR-006: Real Microphone as Default](../decisions/ADR-006-real-mic-default.md) for rationale.

### ASR Events

All engines emit the same event types:

| Event | Description |
|-------|-------------|
| `asr:status` | Engine state changes (idle, recording, processing) |
| `asr:partial` | Streaming intermediate transcription |
| `asr:final` | Completed transcription segment |
| `asr:error` | Error conditions (no mic, permission denied, etc.) |

### Future: Whisper.cpp integration

The transcription pipeline is now implemented:

1. **Audio capture:** MediaRecorder → WebM/Opus blobs
2. **HTTP transport:** whisperTranscriber → POST /transcribe
3. **Conversion:** sidecar ffmpeg → 16kHz mono WAV
4. **Transcription:** whisper-rs → text output
5. **Event emission:** asr:final → editor application

The frontend automatically falls back to stubTranscriber if the sidecar is unavailable.
## Markdown formatting

- Bold: `**text**`
- Italic: `*text*`
- Underline: `<u>text</u>`

The editor must support:
- selection-based formatting
- identifying “last dictated span” (range tracking)
- applying wrap/unwrap operations with minimal disruption (preserve whitespace)
