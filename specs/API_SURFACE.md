# API Surface
## Proposed Tauri commands

### Transcription
- `transcribe_file(path, opts) -> { text, segments }`
- `transcribe_buffer(bytes_base64, opts) -> { text, segments }`
- `list_models() -> [ModelInfo]`
- `download_model(model_id) -> ProgressHandle`
- `set_active_model(model_id)`

### Editor / operations
- `apply_op(op: Op) -> ApplyResult`
- `apply_ops(ops: [Op]) -> ApplyResult`
- `undo() -> ApplyResult`
- `redo() -> ApplyResult`
- `get_document() -> { markdown, version }`
- `set_document(markdown) -> { version }`

### Settings
- `get_settings() -> Settings`
- `set_settings(settings_patch) -> Settings`
  - includes `locale` (`en-GB`/`en-US`) and `enable_us_aliases`

## Events
- `transcription:progress`
- `transcription:result`
- `model:download_progress`
- `editor:changed` (versioned updates)
- `toast` (user-facing notifications, e.g., “Couldn’t find 'budget'”)

## Types (sketch)
See `docs/technical/VOICE_COMMANDS.md` for `Op`, `Style`, `Scope`, etc.
