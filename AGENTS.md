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
pnpm lint
pnpm typecheck
pnpm test
cd src-tauri && cargo test
```

## Docker
See `docs/technical/DOCKER_FOR_AGENTS.md`.
