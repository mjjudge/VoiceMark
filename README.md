# VoiceMark

Offline voice-to-text with **voice-driven editing** and a **Markdown-first editor**.

## v0.1 goals
- In-app dictation with realtime transcript panel
- Manual selection/editing + bold/italic/underline
- Prefix-gated voice commands: **“VoiceMark …”** / **“Voice Mark …”**
- Store notes as Markdown (underline as `<u>…</u>`)
- Whisper.cpp sidecar design target

## Current Status: Simulated ASR
The application currently uses a **simulated ASR engine** (`src/asr/simulatedAsr.ts`) for development and testing. This allows the UI and event streaming architecture to be developed and validated without requiring microphone access or Whisper integration.

**Features implemented:**
- Event-based ASR architecture with status, partial, and final events
- Live transcript panel with recording state display
- Commit/Clear actions for managing transcribed text
- Integration with TipTap editor via EditorOps

**Next steps:** Replace the simulated engine with real Whisper.cpp integration while maintaining the same event interface.

## Docs
- `docs/functional/UI_SPEC_V0_1.md`
- `docs/technical/VOICE_COMMANDS.md`
- `docs/technical/DOCKER_FOR_AGENTS.md`

## Docker dev (lint/test/docs)
```bash
docker compose run --rm dev bash
pnpm -v
rustc -V
```
