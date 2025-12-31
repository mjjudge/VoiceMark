# Docker for Agents (Dev Environment)

VoiceMark is a desktop app, but Docker provides a reproducible toolchain for:
- linting/typechecking/tests
- building backend/frontend artefacts consistently (CI-like)

## What Docker can and cannot do
- ✅ Run formatting, linting, unit tests, docs tooling
- ✅ Build the Rust backend and frontend bundles
- ⚠️ Running the full GUI (Tauri) inside Docker is possible but not recommended for routine dev.
  GUI-on-Docker needs X11/Wayland passthrough and is host-specific.

## Quick start
```bash
docker compose run --rm dev bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
cd src-tauri && cargo test
```

## Notes
- Repo is mounted into `/work`
- Cargo + pnpm caches are stored in named volumes for speed
