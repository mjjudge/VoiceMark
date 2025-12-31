# ADR-005: UI Shell Implementation First

**Status**: Accepted  
**Date**: 2025-12-31  
**Context**: Issue #1 - VoiceMark UI Shell Implementation

## Context

VoiceMark v0.1 requires a desktop application with a rich UI including:
- Header with app name, locale selector, and settings
- Live transcript panel for real-time speech display
- Markdown editor for note editing
- Footer with recording controls and toggles

## Decision

Implement the UI shell in phases:
1. **Phase 1 (This ADR)**: Static UI shell with placeholder components
   - Basic layout and structure
   - Non-functional components (visual only)
   - Interactive toggles for Record/Stop, Auto-Commit, Command Mode
   - No backend integration

2. **Phase 2 (Future)**: Functional integration
   - Connect to Whisper.cpp sidecar
   - Implement real-time transcription
   - Add Markdown editor functionality
   - Voice command processing

## Technology Choices

### Frontend Stack
- **React 18.3.1**: Component-based UI framework
- **TypeScript 5.7.2**: Type safety and better IDE support
- **Vite 6.0.3**: Fast build tool and dev server
- **Inline Styles**: Simple styling approach for MVP (can migrate to CSS-in-JS or CSS modules later)

### Why React + Vite (not Tauri yet)?
While the technical overview mentions Tauri v2, we're starting with a web-based prototype:
- Faster iteration during UI development
- Easier to test and screenshot
- Can be integrated into Tauri later (Vite is Tauri-compatible)
- Allows frontend development to proceed independently of Rust backend

## File Structure

```
src/
├── components/
│   ├── Header.tsx           # App name, locale, settings
│   ├── TranscriptPanel.tsx  # Live transcript display
│   ├── EditorPlaceholder.tsx # Markdown editor placeholder
│   └── Footer.tsx           # Controls and toggles
├── App.tsx                  # Main component composition
├── main.tsx                 # React entry point
└── styles/
    └── global.css           # Global styles and reset
```

## Implementation Details

### Header
- App name: "VoiceMark" (left-aligned)
- Locale dropdown: Default "en-GB", includes "en-US"
- Settings button: Visual only (⚙️ icon)

### Transcript Panel
- Static text: "Ready."
- Distinct background color (#2d2d30)
- Label: "LIVE TRANSCRIPT"

### Editor Placeholder
- Centered placeholder with icon (📝)
- Text: "Markdown Editor (Editor functionality coming soon)"
- Takes up remaining vertical space

### Footer
- **Record/Stop button**: Toggles between:
  - Green "⏺ Record" (initial state)
  - Red "⏹ Stop" (recording state)
- **Auto-Commit toggle**: Checkbox, defaults to ON
- **Command Mode toggle**: Checkbox, defaults to OFF
- **Status text**: "Mic Ready." (right-aligned, green)

## Consequences

### Positive
- ✅ Rapid UI development and iteration
- ✅ Easy to test and validate layout
- ✅ Clear separation of concerns
- ✅ Can demo UI independently of backend
- ✅ TypeScript provides type safety

### Negative
- ⚠️ Need to integrate with Tauri later
- ⚠️ Inline styles may need refactoring for complex themes
- ⚠️ No actual functionality yet (expected for Phase 1)

### Neutral
- 📝 Will need to add Tauri commands for IPC
- 📝 May need to adjust layout for desktop window constraints
- 📝 Styling approach can evolve (CSS modules, styled-components, etc.)

## Next Steps

1. Integrate Tauri v2 backend
2. Connect to Whisper.cpp sidecar
3. Implement real-time transcription display
4. Add functional Markdown editor (CodeMirror or Monaco)
5. Implement voice command processing
6. Add settings modal functionality

## References

- Issue #1: UI Shell Implementation
- `docs/functional/UI_SPEC_V0_1.md` - Full UI specification
- `docs/technical/TECHNICAL_OVERVIEW.md` - Technology stack
- `specs/v0.1-ui-spec.md` - Detailed UI specification
