# ADR-0002: Transcription engine via Whisper.cpp sidecar

## Status
Proposed

## Context
VoiceMark requires offline transcription on Ubuntu (and optionally macOS/Windows). The system should be:
- Local-first (no cloud dependency)
- Reproducible installs
- Able to use CPU by default, with optional acceleration later

## Decision
Adopt **Whisper.cpp** as the primary ASR engine, invoked via a **sidecar** process.

## Rationale
- Very portable across Linux distros
- Simple binary distribution
- Strong performance and wide community use
- Avoids embedding complex native dependencies directly into the Tauri/Rust process

## Consequences
- Need to define a stable sidecar protocol (JSON)
- Need to manage model downloads compatible with whisper.cpp
- Future GPU acceleration depends on platform build options
