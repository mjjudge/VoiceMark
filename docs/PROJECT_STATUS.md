# VoiceMark Project Status

**Last Updated:** January 3, 2026  
**Version:** 0.1 (Pre-release)  
**Repository:** VoiceMark  
**Branch:** main

---

## Overview

VoiceMark is an **offline voice-to-text application** with voice-driven editing and a Markdown-first editor. It runs on Ubuntu (Wayland/X11) and is designed for in-app dictation with prefix-gated voice commands.

### Key Principles
- **Offline-first**: No cloud dependencies; all processing happens locally
- **Voice command prefix**: Commands use "VoiceMark..." or "Voice Mark..." prefix
- **Markdown storage**: Notes stored as Markdown with `<u>...</u>` for underline
- **Pluggable transcription**: Architecture supports swapping transcription backends

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VoiceMark UI                            │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │  Header  │  │ TranscriptPanel │  │        Editor          │  │
│  │(Settings)│  │ (Live/Final)    │  │      (TipTap)          │  │
│  └──────────┘  └─────────────────┘  └────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Footer (Controls)                      │   │
│  │  [Record/Stop] [Auto-Apply] [Mic Selector] [Status]       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ASR Engine Layer                           │
│  ┌─────────────────┐     ┌─────────────────────────────────┐    │
│  │  AsrEngine      │     │   Implementations               │    │
│  │  Interface      │◄────│   • recordingAsrEngine (real)   │    │
│  │  (events.ts)    │     │   • simulatedAsrEngine (test)   │    │
│  └─────────────────┘     └─────────────────────────────────┘    │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Transcriber Interface                       │    │
│  │   • stubTranscriber (current - placeholder)              │    │
│  │   • whisperTranscriber (future - Whisper.cpp)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Voice Command Processing                       │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ extractVoice  │  │ voiceCommandTo   │  │ parseInline      │  │
│  │ MarkCommand   │──│ EditorOp         │──│ VoiceMark        │  │
│  └───────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Editor Operations                           │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   ops.ts      │  │  applyToTiptap   │  │   sentence.ts    │  │
│  │  (EditorOp)   │──│     .ts          │──│ (text utils)     │  │
│  └───────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Root Configuration
| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite bundler configuration |
| `eslint.config.js` | ESLint rules |
| `index.html` | HTML entry point with microphone favicon |
| `AGENTS.md` | Instructions for AI agents working on the codebase |
| `README.md` | Project overview and quick start |

### Source Code (`src/`)

#### Entry Points
| File | Purpose |
|------|---------|
| `main.tsx` | React app entry point |
| `App.tsx` | Main application component, ASR event handling, engine selection |

#### Components (`src/components/`)
| File | Purpose |
|------|---------|
| `Header.tsx` | App header with Settings button |
| `TranscriptPanel.tsx` | Live transcript display (partial/final), max-height 35vh with auto-scroll |
| `Editor.tsx` | TipTap rich text editor wrapper |
| `EditorPlaceholder.tsx` | Placeholder for empty editor |
| `Footer.tsx` | Recording controls, toggles, mic selector, status display |

#### ASR Layer (`src/asr/`)
| File | Purpose |
|------|---------|
| `events.ts` | `AsrEvent` types, `AsrEngine` interface, `AsrStartOptions` |
| `recordingAsr.ts` | Real microphone capture via Web Audio API, pluggable transcriber |
| `simulatedAsr.ts` | Fake ASR for testing, emits sample VoiceMark commands |
| `textBuffer.ts` | Text buffer with spacing normalization logic |
| `applyFinalToEditor.ts` | Applies final ASR text to editor with proper spacing |

#### Transcription (`src/asr/transcription/`)
| File | Purpose |
|------|---------|
| `types.ts` | `Transcriber` interface definition |
| `stubTranscriber.ts` | Placeholder transcriber returning descriptive text |

#### Voice Command Processing (`src/voice/`)
| File | Purpose |
|------|---------|
| `types.ts` | Voice command type definitions |
| `extractVoiceMarkCommand.ts` | Extracts VoiceMark commands from transcript text |
| `voiceCommandToEditorOp.ts` | Converts voice commands to `EditorOp` operations |
| `parseInlineVoiceMark.ts` | Parses mixed dictation with inline commands |
| `parseTranscriptToOps.ts` | Converts full transcript to editor operations |
| `parseMixedDictation.ts` | Handles mixed text + commands |

#### Editor Operations (`src/editor/`)
| File | Purpose |
|------|---------|
| `ops.ts` | `EditorOp` type definitions (insert, format, delete, etc.) |
| `applyToTiptap.ts` | Applies EditorOps to TipTap editor instance |
| `sentence.ts` | Sentence/word boundary detection utilities |

#### Styles (`src/styles/`)
| File | Purpose |
|------|---------|
| `global.css` | Global CSS styles, dark theme |

### Tests
All test files use Vitest and are co-located with source files:
- `*.test.ts` - Unit tests
- `*.integration.test.ts` - Integration tests

**Current test count:** 231 tests across 12 test files

---

## ASR Event System

### Event Types
```typescript
type AsrEvent = 
  | { type: 'asr:status'; state: 'idle' | 'recording' | 'processing'; message?: string }
  | { type: 'asr:partial'; text: string; ts: number }
  | { type: 'asr:final'; text: string; ts: number }
  | { type: 'asr:error'; message: string }
```

### Engine Interface
```typescript
interface AsrEngine {
  start(onEvent: AsrEventCallback, options?: AsrStartOptions): Promise<void> | void;
  stop(): void;
}

interface AsrStartOptions {
  deviceId?: string;  // Specific microphone device ID
}
```

### Transcriber Interface
```typescript
interface Transcriber {
  transcribe(blob: Blob, opts?: { signal?: AbortSignal }): Promise<string>;
}
```

---

## Voice Commands (Implemented)

### Punctuation
| Command | Result |
|---------|--------|
| `voicemark comma` | `,` |
| `voicemark full stop` / `voicemark period` | `.` |
| `voicemark question mark` | `?` |
| `voicemark exclamation mark` | `!` |
| `voicemark colon` | `:` |
| `voicemark semicolon` | `;` |
| `voicemark dash` | `—` |

### Layout
| Command | Result |
|---------|--------|
| `voicemark new line` | Line break |
| `voicemark new paragraph` | Double line break |

### Editing
| Command | Result |
|---------|--------|
| `voicemark delete last word` | Removes last word + preceding space |
| `voicemark delete last sentence` | Removes last sentence |

### Formatting
| Command | Result |
|---------|--------|
| `voicemark make bold` | Bold selection/last dictated |
| `voicemark make italic` | Italicize selection/last dictated |
| `voicemark make underline` | Underline selection/last dictated |
| `voicemark toggle bold/italic/underline` | Toggle formatting |
| `voicemark unmake bold/italic/underline` | Remove formatting |

---

## Current Status

### ✅ Completed

1. **UI Shell**
   - Header, Footer, Editor, TranscriptPanel components
   - Dark theme styling
   - Recording controls with state management

2. **ASR Infrastructure**
   - AsrEngine interface with pluggable implementations
   - Real microphone capture via Web Audio API
   - Simulated ASR for testing
   - Microphone device selection
   - ASR event system (status, partial, final, error)

3. **Transcription Pipeline**
   - Pluggable Transcriber interface
   - Stub transcriber for development
   - Audio chunk collection and blob assembly
   - Abort/cancellation support
   - Status transitions: recording → processing → idle

4. **Voice Command Processing**
   - VoiceMark prefix detection
   - Command extraction and parsing
   - EditorOp generation
   - Mixed dictation handling (text + inline commands)

5. **Editor Integration**
   - TipTap editor with basic formatting
   - EditorOp application
   - Spacing normalization
   - Sentence/word boundary detection
   - Delete last word/sentence operations

6. **Testing**
   - 231 unit/integration tests
   - Comprehensive coverage of voice command parsing
   - ASR event routing tests

7. **Documentation**
   - Architecture Decision Records (ADRs)
   - Technical specifications
   - Voice command reference
   - Docker setup for agents

### 🚧 In Progress

1. **Real Transcription**
   - Audio capture works ✅
   - Stub transcriber in place ✅
   - Whisper.cpp integration pending

### ❌ Not Started

1. **Whisper.cpp Sidecar**
   - Sidecar process design (ADR-0002)
   - JSON protocol for transcription requests
   - Model loading and configuration
   - Audio format conversion (WebM → WAV)

2. **Settings Panel**
   - Microphone configuration (currently in footer)
   - Audio level visualization
   - Model selection
   - Language/locale settings

3. **File Operations**
   - Save/load Markdown files
   - File browser integration
   - Auto-save functionality

4. **Tauri Integration**
   - Desktop app packaging
   - Native file system access
   - System tray integration

5. **Advanced Voice Commands**
   - Navigation commands (go to start/end)
   - Selection commands
   - Undo/redo via voice
   - Custom command macros

---

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `VITE_ASR_MODE` | `real`, `simulated` | `real` | ASR engine selection |

### Usage
```bash
# Real microphone (default)
pnpm dev

# Simulated ASR (no microphone needed)
VITE_ASR_MODE=simulated pnpm dev
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# All checks
pnpm test && pnpm typecheck && pnpm lint
```

---

## Architecture Decisions (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Docs-first approach | Accepted |
| ADR-002 | Offline-first architecture | Accepted |
| ADR-003 | Markdown storage | Accepted |
| ADR-004 | Docker agent development | Accepted |
| ADR-005 | UI shell implementation | Accepted |
| ADR-006 | Real microphone as default | Accepted |
| ADR-0001 | Product scope | Proposed |
| ADR-0002 | Transcription engine (Whisper.cpp sidecar) | Proposed |

---

## Next Steps (Priority Order)

1. **Whisper.cpp Integration**
   - Create `whisperTranscriber.ts` implementing `Transcriber` interface
   - Design sidecar protocol (JSON over stdin/stdout or HTTP)
   - Handle audio format conversion
   - Implement streaming or batch transcription

2. **Audio Pipeline Improvements**
   - Voice Activity Detection (VAD)
   - Audio level metering for UI feedback
   - Noise gate / silence detection

3. **Settings Panel**
   - Move microphone selector to Settings
   - Add audio level visualization
   - Model selection for Whisper

4. **File System**
   - Implement save/load for Markdown files
   - Add file browser
   - Auto-save with debouncing

5. **Tauri Desktop App**
   - Package as native Linux app
   - Native file dialogs
   - System integration

---

## Dependencies

### Production
- React 18
- TipTap (ProseMirror-based editor)
- Vite

### Development
- TypeScript
- Vitest
- ESLint

---

## Contact / Notes

- Primary target: Ubuntu (Wayland/X11)
- v0.1 scope: In-app dictation only (no global hotkeys, no OS-wide text injection)
- Command prefix: "VoiceMark" or "Voice Mark"
