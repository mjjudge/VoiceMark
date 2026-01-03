# AGENTS.md (VoiceMark)

How agents (and humans) should work in this repository.

## Defaults
- Primary OS target: Ubuntu
- Command prefix: **“VoiceMark …”** (accept **“Voice Mark …”**)
- Notes stored as Markdown (underline uses `<u>…</u>`)

## Workflow
### Branching
- Feature branches off `main`: `feat/...`, `fix/...`, `docs/...`

### Commits
- Commit regularly (logical checkpoints)
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Avoid large mixed commits

### Backups
- Perform **twice daily backups** of the working directory (morning/evening)
- Keep 7 days of snapshots

### Documentation updates (required)
If behaviour changes, update relevant docs:
- `docs/functional/FUNCTIONAL_REQUIREMENTS.md`
- `docs/functional/UI_SPEC_V0_1.md`
- `docs/technical/TECHNICAL_SPEC.md`
- `docs/technical/VOICE_COMMANDS.md`
- `specs/API_SURFACE.md`
- ADRs in `docs/decisions/` as needed

## Dev commands
```bash
pnpm install
pnpm dev                           # Real microphone (default)
pnpm dev:simulated                 # Simulated ASR (no mic needed)
pnpm lint
pnpm typecheck
pnpm test

# Sidecar commands
pnpm sidecar:download-model        # Download base.en model (~142 MB)
pnpm sidecar:build                 # Build sidecar (debug)
pnpm sidecar:build:release         # Build sidecar (release)
pnpm sidecar:run                   # Run sidecar (localhost:3001)
pnpm sidecar:test                  # Run sidecar tests
```

## ASR Modes
- **real** (default): Uses real microphone capture
- **simulated**: Emits fake transcription for testing

Agents working in Docker/CI should use simulated mode. See [ADR-006](docs/decisions/ADR-006-real-mic-default.md).

## Docker
See `docs/technical/DOCKER_FOR_AGENTS.md`.
