# Architecture

## High-level
- UI: Tauri + React
- Backend: Rust service exposed via Tauri commands
- Storage: SQLite for metadata + corrections; filesystem for audio + models

## Components
1. **UI Shell**
   - Recording controls, transcript editor, settings, model manager

2. **Transcription Engine** (pluggable)
   - Option A: `whisper-rs` (Rust-native)
   - Option B: `whisper.cpp` sidecar (CLI/IPC)

3. **Audio IO**
   - Recording (cpal / mic recorder plugin)
   - Import/Decode (symphonia)
   - Normalisation/resampling (rubato)

4. **Personalisation Layer**
   - Personal lexicon (names/acronyms)
   - Correction memory (pairs of audio segment ↔ corrected text)
   - Prompt/context builder
   - Post-processing (replacement rules)

5. **Data layer**
   - SQLite: documents, recordings, transcripts, corrections, vocab
   - Files: raw audio, derived wav, model blobs

## Key interfaces
- `transcribe_file(path, options) -> transcript_id`
- `record_start()` / `record_stop() -> recording_id`
- `get_transcript(id)` / `update_transcript(id, text)`
- `save_correction(transcript_id, before, after, span)`
- `list_models()` / `download_model(model_id)` / `set_active_model(model_id)`

## Security & privacy
- Default local-only
- Explicit user action to export/share

## Diagram
(put a simple component diagram in `docs/diagrams/` later)
## Key components (v0.1)

- **UI (Tauri + React)**
  - Recorder controls / file import
  - Markdown editor (with selection + formatting)
  - Model manager
  - Settings (locale packs, command mode)

- **Backend (Rust)**
  - Audio capture & file decoding
  - Sidecar manager (Whisper.cpp)
  - **Command Processor**
  - **Document Buffer + Operation Log (undo/redo)**
  - Persistence (SQLite + file store)

## Data flow

1. User records or imports audio.
2. Backend sends audio to Whisper.cpp sidecar.
3. Sidecar returns transcript text + optional segments.
4. Backend runs **Command Processor**:
   - prefixed commands → `Op` list
   - plain dictation → `InsertText` op
5. Backend applies ops to Markdown buffer, updates undo stack.
6. UI renders updated Markdown and shows notifications.

See `docs/technical/VOICE_COMMANDS.md` for grammar and operation model.
