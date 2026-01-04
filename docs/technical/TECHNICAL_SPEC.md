# Technical Spec
## Transcription Engine (Whisper.cpp sidecar)

VoiceMark uses a **local Rust sidecar** for speech-to-text transcription.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  recordingAsr.ts → whisperTranscriber.ts                ││
│  │       ↓                     ↓                           ││
│  │  MediaRecorder          POST /transcribe                ││
│  │  (WebM/Opus)            (multipart form)                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP localhost:3001
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Sidecar (Rust + axum + whisper-rs)                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  main.rs (HTTP server)                                  ││
│  │     ↓                                                   ││
│  │  audio.rs (ffmpeg: WebM→WAV)                            ││
│  │     ↓                                                   ││
│  │  transcribe.rs (whisper.cpp)                            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Sidecar API

**Health check:**
```
GET /health → { "ok": true, "model_loaded": true }
```

**Transcription:**
```
POST /transcribe
Content-Type: multipart/form-data
Field: file (audio blob)

Response: { "text": "...", "segments": N }
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| HTTP server | `sidecar/src/main.rs` | axum server with /health and /transcribe |
| Audio conversion | `sidecar/src/audio.rs` | ffmpeg WebM/Opus → 16kHz WAV |
| Transcription | `sidecar/src/transcribe.rs` | whisper-rs wrapper |

### Model

Default: `small.en` model (~466 MB). Download to `sidecar/models/`:

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
| **Recording** | `src/asr/recordingAsr.ts` | Real microphone capture via Web Audio API |
| **Simulated** | `src/asr/simulatedAsr.ts` | Fake transcription for testing |

### Mode selection

The active engine is selected via the `VITE_ASR_MODE` environment variable:

- **`real`** (default): Uses `recordingAsrEngine` - captures real audio
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
