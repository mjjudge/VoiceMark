# ADR-007: Rust for Whisper.cpp Sidecar

## Status
Accepted

## Context

VoiceMark requires a sidecar process to run Whisper.cpp for speech-to-text transcription (see ADR-0002). The sidecar needs to:

1. Load and manage Whisper models
2. Accept audio data from the frontend
3. Run transcription and return results
4. Handle concurrent requests efficiently
5. Be distributable as a single binary

We need to choose an implementation language for this sidecar. Options considered:

| Language | Runtime | Binary Size | whisper.cpp Integration |
|----------|---------|-------------|------------------------|
| **Rust** | None (native) | ~5-10MB | whisper-rs bindings |
| **Go** | None (native) | ~10-15MB | cgo bindings |
| **Node.js** | Required | N/A + runtime | whisper-node bindings |
| **C++** | None (native) | ~2-5MB | Direct |
| **Python** | Required | N/A + runtime | whisper.cpp Python |

## Decision

Use **Rust** as the implementation language for the Whisper.cpp sidecar.

## Rationale

### 1. Tauri Alignment
VoiceMark is designed to eventually become a Tauri desktop application. Tauri is Rust-based, so using Rust for the sidecar:
- Enables future consolidation into a single Tauri binary
- Shares the same toolchain and build system
- Allows code reuse between sidecar and Tauri commands

### 2. whisper-rs Bindings
The [whisper-rs](https://github.com/tazz4843/whisper-rs) crate provides mature, well-maintained Rust bindings for whisper.cpp:
- Safe Rust API over C++ internals
- Actively maintained with regular updates
- Supports all whisper.cpp features (models, languages, prompts)
- Good documentation and examples

### 3. Single Binary Distribution
Rust compiles to a single static binary:
- No runtime dependencies (unlike Node.js/Python)
- Simple installation: download and run
- Cross-compilation for Linux/macOS/Windows
- Smaller attack surface

### 4. Performance
Rust provides:
- Zero-cost abstractions
- Predictable memory usage (no GC pauses)
- Excellent async I/O (tokio) for concurrent requests
- Native threading for CPU-bound transcription

### 5. Safety
Rust's ownership system prevents:
- Memory leaks from audio buffers
- Data races in concurrent transcription
- Null pointer dereferences

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VoiceMark Frontend                        │
│                    (TypeScript/React)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP or stdin/stdout JSON
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 voicemark-whisper (Rust)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    API Layer                         │    │
│  │  • HTTP server (axum/actix) or stdin/stdout         │    │
│  │  • JSON request/response                            │    │
│  │  • Request validation                               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Transcription Engine                 │    │
│  │  • whisper-rs bindings                              │    │
│  │  • Model loading and caching                        │    │
│  │  • Audio format conversion                          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Audio Processing                  │    │
│  │  • WebM/Opus → PCM conversion                       │    │
│  │  • Resampling to 16kHz                              │    │
│  │  • VAD (Voice Activity Detection)                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Basic Sidecar
1. Create `voicemark-whisper` Rust crate
2. Implement stdin/stdout JSON protocol
3. Integrate whisper-rs for transcription
4. Support basic audio input (WAV/PCM)

### Phase 2: Audio Conversion
1. Add symphonia or rodio for audio decoding
2. Support WebM/Opus from browser MediaRecorder
3. Implement resampling to 16kHz mono

### Phase 3: Service Mode
1. Add HTTP server (axum)
2. Implement concurrent request handling
3. Add model caching and management

### Phase 4: Tauri Integration
1. Migrate sidecar logic into Tauri commands
2. Remove separate process in favor of in-process calls
3. Share model state across requests

## Crate Dependencies

```toml
[dependencies]
whisper-rs = "0.11"          # Whisper.cpp bindings
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
symphonia = "0.5"            # Audio decoding
rubato = "0.14"              # Audio resampling
axum = "0.7"                 # HTTP server (Phase 3)
```

## Consequences

### Positive
- Single binary distribution
- High performance, low latency
- Future-proof for Tauri integration
- Strong type safety and memory safety
- Active ecosystem for audio processing

### Negative
- Rust learning curve for contributors
- Longer compile times than Go/Node
- Whisper.cpp updates may lag whisper-rs

### Mitigations
- Provide pre-built binaries for common platforms
- Document Rust development setup clearly
- Monitor whisper-rs releases and contribute if needed

## Alternatives Rejected

### Go
- Good single-binary story
- CGO required for whisper.cpp (complicates cross-compilation)
- No synergy with Tauri (would remain separate process)

### Node.js
- Familiar to frontend developers
- Requires Node runtime installation
- Less efficient for CPU-bound transcription
- Memory management less predictable

### C++
- Direct whisper.cpp integration
- More complex memory management
- Cross-platform build complexity
- Less safe than Rust

## Related

- ADR-0002: Transcription engine via Whisper.cpp sidecar
- [whisper-rs](https://github.com/tazz4843/whisper-rs)
- [Tauri](https://tauri.app/)
