# Streaming Transcription Plan

**Author:** VoiceMark Team  
**Created:** 2025-01-XX  
**Status:** Draft / Planning  

## Overview

Currently VoiceMark uses a **batch transcription** model:
1. User presses record → audio chunks accumulate
2. User releases record → all audio sent to sidecar
3. Sidecar transcribes entire recording at once → result returned

**Goal:** Implement **streaming transcription** where text appears in real-time as the user speaks, before they stop recording.

---

## Current Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│     Frontend        │         │      Sidecar        │
│                     │         │                     │
│ MediaRecorder       │         │  Rust + axum        │
│    ↓                │         │    ↓                │
│ Blob chunks (1s)    │   ──→   │  POST /transcribe   │
│                     │  (batch)│    ↓                │
│ asr:final event  ←──│   ←──   │  whisper-rs batch   │
└─────────────────────┘         └─────────────────────┘
```

### Current Flow
1. `recordingAsr.ts` captures audio in 1-second chunks via `MediaRecorder`
2. Chunks accumulate in memory (`audioChunks[]`)
3. On stop, all chunks combined → single POST to `/transcribe`
4. Sidecar converts WebM→WAV, runs full Whisper inference
5. Single `asr:final` event returned

### Latency Problem
- User must finish speaking before any text appears
- For long dictation (30s+), no feedback during recording
- Bad UX: user doesn't know if it's working

---

## Target Architecture: WebSocket Streaming

```
┌─────────────────────┐         ┌─────────────────────┐
│     Frontend        │  WS     │      Sidecar        │
│                     │   ↓↑    │                     │
│ AudioWorklet        │ ──────→ │  WS /stream         │
│    ↓ (PCM chunks)   │         │    ↓                │
│                     │   ←──── │  Whisper streaming  │
│ asr:partial events  │         │  (partial results)  │
│ asr:final event     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

### Target Flow
1. WebSocket connection opened at `/stream`
2. Frontend sends PCM audio chunks every ~500ms
3. Sidecar maintains sliding window of audio
4. Partial transcription returned after each chunk (low confidence)
5. When user stops, final transcription returned (high confidence)
6. Frontend shows partials grayed out, replaces with final

---

## Implementation Options

### Option A: Whisper.cpp Real-Time (Recommended)

**Whisper.cpp** has experimental real-time streaming support:
- `stream` example in whisper.cpp repo
- Uses Voice Activity Detection (VAD)
- Processes audio in overlapping windows

**Pros:**
- Stay in Rust ecosystem (faster, single binary)
- whisper-rs already integrated
- Lower resource usage than Python

**Cons:**
- Streaming is still experimental in whisper.cpp
- May need to update whisper-rs bindings
- Less documentation than Python alternatives

**Effort:** 3-5 days

### Option B: Faster-Whisper Python Sidecar

Replace Rust sidecar with Python using `faster-whisper` library:
- GPU support via CTranslate2
- Better streaming support
- Larger community

**Pros:**
- More mature streaming examples
- GPU acceleration if CUDA available
- Easier to experiment with

**Cons:**
- Python runtime dependency
- More memory usage
- Deployment complexity

**Effort:** 5-8 days

### Option C: Hybrid (Both Sidecars)

Keep Rust sidecar for batch, add Python for streaming:
- User can choose based on hardware
- Fallback if one fails

**Pros:**
- Flexibility
- Gradual migration path

**Cons:**
- Two codebases to maintain
- Configuration complexity

**Effort:** 8-12 days

---

## Recommended Approach: Option A (Whisper.cpp Streaming)

Given the existing Rust investment and VoiceMark's offline-first focus, we should enhance the current sidecar.

### Phase 1: WebSocket Infrastructure (1-2 days)

1. **Add WebSocket endpoint to sidecar**
   ```rust
   // main.rs
   .route("/stream", get(ws_handler))
   ```

2. **Define WebSocket protocol**
   ```json
   // Client → Server: Audio chunk
   { "type": "audio", "data": "<base64 PCM>", "sample_rate": 16000 }
   
   // Server → Client: Partial result
   { "type": "partial", "text": "hello wor", "ts": 1234567890 }
   
   // Server → Client: Final result  
   { "type": "final", "text": "hello world", "ts": 1234567890 }
   
   // Client → Server: End of stream
   { "type": "end" }
   ```

3. **Frontend WebSocket client**
   ```typescript
   // streamingAsr.ts
   const ws = new WebSocket('ws://localhost:3001/stream');
   ws.onmessage = (e) => {
     const msg = JSON.parse(e.data);
     if (msg.type === 'partial') emit({ type: 'asr:partial', text: msg.text });
     if (msg.type === 'final') emit({ type: 'asr:final', text: msg.text });
   };
   ```

### Phase 2: Audio Pipeline (1-2 days)

1. **Replace MediaRecorder with AudioWorklet**
   - Direct access to PCM samples
   - Lower latency than MediaRecorder
   - No codec overhead

2. **Audio resampling in browser**
   - Convert to 16kHz mono
   - Send raw PCM (no WebM container)

3. **Frontend audio buffering**
   ```typescript
   // Collect 500ms of audio, send to WebSocket
   const CHUNK_SIZE = 16000 * 0.5; // 8000 samples = 500ms
   ```

### Phase 3: Whisper Streaming (2-3 days)

1. **Investigate whisper-rs streaming API**
   - Check if `whisper-rs` exposes streaming/partial
   - May need to use lower-level whisper.cpp bindings

2. **Sliding window transcription**
   ```
   Audio buffer: [====|====|====|====]
                      ↑
                 Current position
   
   - Keep last 10-30s of audio
   - Re-transcribe with context on each chunk
   - Emit partial after each chunk
   - Emit final when "end" received
   ```

3. **Confidence thresholding**
   - Low confidence → partial (grayed text)
   - High confidence → final (committed text)

### Phase 4: Frontend Integration (1 day)

1. **Update ASR events handling**
   - Partials update transcript panel (grayed)
   - Finals commit to editor
   - Smooth transition between partial/final

2. **Fallback to batch mode**
   - If WebSocket fails, use existing POST `/transcribe`
   - Configuration toggle for user preference

---

## Detailed Implementation Plan

### Week 1: WebSocket + Audio Pipeline

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Add WebSocket endpoint to sidecar | `/stream` accepts connections |
| 2 | AudioWorklet for PCM capture | Raw audio in browser |
| 3 | Wire WS client to AudioWorklet | Audio flows to sidecar |
| 4 | Test round-trip (echo audio back) | End-to-end verified |

### Week 2: Whisper Integration

| Day | Task | Deliverable |
|-----|------|-------------|
| 5 | Research whisper-rs streaming | Document findings |
| 6 | Implement sliding window buffer | Audio accumulation |
| 7 | Periodic re-transcription | Partials returned |
| 8 | Final transcription on end | Complete result |
| 9 | Frontend partial display | Text appears while speaking |
| 10 | Testing + bug fixes | Stable streaming |

---

## Technical Decisions Needed

### 1. Chunk Size / Latency Tradeoff

| Chunk Size | Latency | Accuracy | CPU Load |
|------------|---------|----------|----------|
| 250ms | Low | Poor | Very High |
| 500ms | Medium | Fair | High |
| 1000ms | Higher | Good | Medium |
| 2000ms | High | Best | Low |

**Recommendation:** Start with 1000ms, allow user configuration.

### 2. Sliding Window Size

How much audio context to keep for each partial?

- **5 seconds:** Fast, but misses context
- **15 seconds:** Balanced
- **30 seconds:** Best accuracy, slower

**Recommendation:** 15 seconds, configurable via env var.

### 3. Partial Emission Strategy

When to emit partial results?

- **After each chunk:** Most responsive, flickery
- **On silence detection:** Natural pauses
- **Fixed interval:** Predictable (every 1s)

**Recommendation:** Fixed 1-second interval with VAD enhancement later.

### 4. WebSocket vs Server-Sent Events

| Approach | Pros | Cons |
|----------|------|------|
| WebSocket | Bidirectional, real-time | More complex |
| SSE | Simpler, one-way | Can't send audio up |

**Decision:** WebSocket (we need bidirectional for audio upload).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| whisper-rs lacks streaming API | High | Use raw whisper.cpp bindings or Python fallback |
| High CPU during streaming | Medium | Limit re-transcription frequency |
| Audio quality degradation | Medium | Test with various microphones |
| Browser AudioWorklet support | Low | Fallback to MediaRecorder chunks |

---

## Success Criteria

1. **Text appears within 1.5 seconds** of speaking
2. **No UI jank** during continuous dictation
3. **Final accuracy** matches or exceeds batch mode
4. **CPU usage** stays under 100% on target hardware (GTX 750 Ti / i5)
5. **Fallback works** if streaming fails

---

## Files to Create/Modify

### Sidecar (Rust)
- `sidecar/src/ws.rs` - WebSocket handler (new)
- `sidecar/src/main.rs` - Add `/stream` route
- `sidecar/src/stream_transcribe.rs` - Streaming transcription (new)
- `sidecar/Cargo.toml` - Add `tokio-tungstenite` dependency

### Frontend (TypeScript)
- `src/asr/streamingAsr.ts` - WebSocket client (new)
- `src/asr/audioWorklet.ts` - Raw PCM capture (new)
- `src/asr/audioResampler.ts` - 16kHz conversion (new)
- `src/asr/events.ts` - Add streaming-specific events
- `src/components/TranscriptPanel.tsx` - Partial text display

### Documentation
- `docs/technical/STREAMING_TRANSCRIPTION_PLAN.md` (this file)
- `docs/decisions/ADR-0XX-streaming-architecture.md`
- `docs/technical/TECHNICAL_SPEC.md` - Update architecture

---

## Next Steps

1. ✅ Create this plan document
2. ⬜ Review and approve approach
3. ⬜ Create ADR for streaming decision
4. ⬜ Spike: Verify whisper-rs streaming capability
5. ⬜ Begin Phase 1 implementation

---

## References

- [whisper.cpp stream example](https://github.com/ggerganov/whisper.cpp/tree/master/examples/stream)
- [AudioWorklet API](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [tokio-tungstenite](https://github.com/snapview/tokio-tungstenite)
- [whisper-rs](https://github.com/tazz4843/whisper-rs)
- [faster-whisper](https://github.com/guillaumekln/faster-whisper)
