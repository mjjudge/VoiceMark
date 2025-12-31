# ADR-002: Offline-First Architecture

**Date**: 2025-12-31

**Status**: Accepted

## Context

Many dictation applications require internet connectivity and send voice data to cloud services for processing. This raises privacy concerns and makes the application dependent on network availability.

## Decision

VoiceMark will be built as an **offline-first application** that:

1. Performs all speech recognition locally
2. Stores all data locally on the user's machine
3. Does not require internet connectivity for core functionality
4. Optionally supports cloud sync as an opt-in feature (future)

## Rationale

### Privacy

- User voice data never leaves their machine
- No third-party processing of sensitive information
- Compliance with privacy regulations (GDPR, CCPA, etc.)
- Users maintain full control over their data

### Reliability

- Works without internet connection
- No dependency on external services
- Consistent performance regardless of network quality
- No usage limits or rate throttling

### Cost

- No cloud service fees for speech processing
- No subscription costs for basic functionality
- Predictable resource usage

### Trade-offs

- Requires more local computational resources
- Initial setup may be more complex
- Limited to locally available speech models
- May have lower accuracy than cloud-based solutions initially

## Consequences

### Technical Implications

- Must use local speech recognition engine (e.g., Vosk, Whisper, CMU Sphinx)
- Requires local model downloads and management
- Need to optimize for performance on consumer hardware
- Storage requirements for speech models (typically 50MB-2GB)

### User Experience

- First-run experience includes model download
- Performance depends on user's hardware
- Privacy-conscious users will prefer this approach
- Users expect immediate response without network latency

## Implementation

### Phase 1 (v0.1)

- Integrate local speech recognition engine
- Implement basic dictation functionality
- Store notes as Markdown files locally

### Phase 2 (v0.2+)

- Add multiple language support
- Optimize performance
- Consider optional cloud sync (with user consent)

## Alternatives Considered

### Cloud-Based Processing

**Rejected**: Violates privacy principles and creates external dependencies

### Hybrid Approach

**Deferred**: Could be considered for future versions with explicit user consent

## References

- [Vosk Speech Recognition](https://alphacephei.com/vosk/)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Offline-First Principles](https://offlinefirst.org/)
