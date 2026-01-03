# VoiceMark

Offline voice-to-text with **voice-driven editing** and a **Markdown-first editor**.

## v0.1 goals
- In-app dictation with realtime transcript panel
- Manual selection/editing + bold/italic/underline
- Prefix-gated voice commands: **"VoiceMark …"** / **"Voice Mark …"**
- Store notes as Markdown (underline as `<u>…</u>`)
- Whisper.cpp sidecar design target

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (uses real microphone by default)
pnpm dev
```

The browser will request microphone permission when you click **Record**.

## ASR Modes

VoiceMark supports two ASR (Automatic Speech Recognition) modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **real** (default) | Captures audio from your microphone | Normal usage |
| **simulated** | Emits fake transcription for testing | Development, CI, demos |

### Switching modes

```bash
# Default: real microphone
pnpm dev

# Simulated mode (no microphone needed)
VITE_ASR_MODE=simulated pnpm dev
```

Or create a `.env.local` file:
```bash
VITE_ASR_MODE=simulated
```

### Selecting a microphone

When using real mode, a microphone dropdown appears in the footer. Select your preferred audio input device before recording.

> **Note:** Transcription currently shows placeholder text "(listening...)" while recording. Real Whisper.cpp transcription is the next milestone.

## Current Status

**Implemented:**
- ✅ Event-based ASR architecture with status, partial, and final events
- ✅ Real microphone capture via Web Audio API
- ✅ Microphone device selection
- ✅ Live transcript panel with recording state display
- ✅ Voice command parsing (punctuation, formatting, navigation)
- ✅ TipTap editor integration via EditorOps
- ✅ Simulated ASR mode for testing

**Next steps:**
- Whisper.cpp sidecar integration for real transcription
- Settings panel for microphone/audio configuration

## Docs
- [UI Specification](docs/functional/UI_SPEC_V0_1.md)
- [Voice Commands](docs/technical/VOICE_COMMANDS.md)
- [Technical Spec](docs/technical/TECHNICAL_SPEC.md)
- [Architecture Decisions](docs/decisions/)

## Development

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# All checks
pnpm test && pnpm typecheck && pnpm lint
```

## Docker (for CI/agents)

```bash
docker compose run --rm dev bash
pnpm -v
rustc -V
```

See [Docker for Agents](docs/technical/DOCKER_FOR_AGENTS.md) for details.
