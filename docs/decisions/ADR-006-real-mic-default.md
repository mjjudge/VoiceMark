# ADR-006: Real Microphone as Default ASR Mode

## Status
Accepted

## Context
VoiceMark supports two ASR engine modes:

1. **Real mode** (`recordingAsr.ts`): Captures audio from the user's microphone using the Web Audio API. Currently emits placeholder transcription events while Whisper.cpp integration is pending.

2. **Simulated mode** (`simulatedAsr.ts`): Emits fake transcription events at timed intervals for development and testing without requiring microphone access.

During initial development, simulated mode was the default to allow UI development without hardware dependencies. However, as the application matures and microphone capture is implemented, we need to decide which mode should be the default.

## Decision
**Real microphone mode is the default.** Simulated mode requires explicitly setting `VITE_ASR_MODE=simulated`.

### Rationale

1. **User expectation**: Users launching VoiceMark expect it to use their microphone. Defaulting to simulated mode would be confusing.

2. **Development realism**: Developers should test with real audio capture by default to catch integration issues early.

3. **Graceful degradation**: Real mode handles missing microphones gracefully via error events. Users see a clear error message rather than fake transcription.

4. **Simulated mode is a dev tool**: It's specifically for:
   - Automated testing (CI environments without audio devices)
   - UI development without microphone noise
   - Demonstrating voice command parsing

## Consequences

### For users
- VoiceMark requests microphone permission on first recording
- If no microphone is available, an error is shown in the transcript panel

### For developers
- `pnpm dev` uses real microphone by default
- To test without a microphone: `VITE_ASR_MODE=simulated pnpm dev`
- CI/Docker environments should set `VITE_ASR_MODE=simulated` for tests

### Environment variable
```bash
# Default (real microphone)
pnpm dev

# Simulated mode for testing
VITE_ASR_MODE=simulated pnpm dev

# Or via .env.local
echo "VITE_ASR_MODE=simulated" >> .env.local
```

## Related
- ADR-0002: Transcription engine via Whisper.cpp sidecar
- `src/asr/recordingAsr.ts`: Real microphone capture
- `src/asr/simulatedAsr.ts`: Simulated transcription
- `src/asr/events.ts`: Shared ASrEngine interface
