# Product Requirements Document (PRD)

## Vision
A simple, local-first dictation/transcription tool that runs well on Ubuntu and improves over time via user corrections.

## Non-goals (initially)
- System-wide hotkeys
- Injecting text into the currently focused application
- Cloud transcription

## Core user journeys
1. Record in-app → transcribe → review → copy/export
2. Import audio file → transcribe → review → export
3. Correct transcript → app “learns” vocabulary + phrasing

## MVP features
- In-app recording (push-to-record button)
- File import (wav/mp3/m4a)
- Offline transcription with selectable model
- Transcript editor with correction capture
- Personal dictionary (names, acronyms) and replacement rules
- Export (copy, .txt, .md)

## Quality goals
- Privacy: all processing local by default
- Predictable: clear model status, progress, and errors
- Fast enough: acceptable latency on CPU; optional acceleration later

## Out of scope for MVP (candidate v2)
- Speaker diarisation
- Training/fine-tuning on user voice
- Live partial streaming transcript
- Multi-language auto-detect
