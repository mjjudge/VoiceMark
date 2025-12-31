# Technical Spec
## Transcription Engine (Whisper.cpp sidecar)

VoiceMark uses a **local sidecar** for speech-to-text.

### Sidecar modes
- **Service mode (preferred):** long-running local process with JSON request/response over stdin/stdout or localhost HTTP.
- **CLI mode (fallback):** spawn per transcription task and parse output.

### Suggested interface (service)
Request:
```json
{
  "id": "req-123",
  "op": "transcribe",
  "model": "ggml-large-v3-q5_0.bin",
  "language": "en",
  "prompt": "British English. Prefer 'full stop' wording. Common terms: ...",
  "audio": {
    "format": "wav",
    "sample_rate_hz": 16000,
    "bytes_base64": "…"
  }
}
```

Response:
```json
{
  "id": "req-123",
  "text": "…",
  "segments": [
    { "t0_ms": 0, "t1_ms": 820, "text": "…" }
  ]
}
```

## Command Processor

After transcription, VoiceMark runs a **Command Processor** that:
1) detects prefixed command utterances,
2) compiles them into structured operations,
3) applies operations to a Markdown document buffer,
4) records ops on an undo stack.

See `docs/technical/VOICE_COMMANDS.md` for grammar and op model.

## Markdown formatting

- Bold: `**text**`
- Italic: `*text*`
- Underline: `<u>text</u>`

The editor must support:
- selection-based formatting
- identifying “last dictated span” (range tracking)
- applying wrap/unwrap operations with minimal disruption (preserve whitespace)
