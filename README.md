# VoiceMark

Offline voice-to-text with **voice-driven editing** and a **Markdown-first editor**.

## v0.1 goals
- In-app dictation with realtime transcript panel
- Manual selection/editing + bold/italic/underline
- Prefix-gated voice commands: **“VoiceMark …”** / **“Voice Mark …”**
- Store notes as Markdown (underline as `<u>…</u>`)
- Whisper.cpp sidecar design target

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
