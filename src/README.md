# VoiceMark UI Source

This directory contains the React-based UI for VoiceMark.

## Structure

```
src/
├── components/         # React components
│   ├── Header.tsx     # App header (name, locale, settings)
│   ├── TranscriptPanel.tsx  # Live transcript display
│   ├── EditorPlaceholder.tsx  # Markdown editor placeholder
│   └── Footer.tsx     # Controls (Record/Stop, toggles, status)
├── styles/
│   └── global.css     # Global styles and theme
├── App.tsx            # Main app component
└── main.tsx           # React entry point
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

## Component Overview

### Header
- Displays "VoiceMark" app name
- Locale selector (en-GB, en-US)
- Settings button (non-functional placeholder)

### TranscriptPanel
- Shows live transcription text
- Currently displays static "Ready." text
- Will be connected to Whisper.cpp in future

### EditorPlaceholder
- Placeholder for Markdown editor
- Will be replaced with CodeMirror or Monaco editor

### Footer
- Record/Stop button (toggles state)
- Auto-Commit toggle (default: ON)
- Command Mode toggle (default: OFF)
- Status indicator (shows "Mic Ready.")

## Styling

Currently uses inline styles for simplicity. Dark theme colors:
- Background: `#1e1e1e`
- Secondary: `#252526`
- Tertiary: `#2d2d30`
- Text: `#d4d4d4`
- Accent (success): `#4ec9b0`
- Accent (error): `#d13438`

## Next Steps

1. Integrate with Tauri backend
2. Connect to Whisper.cpp sidecar
3. Implement real Markdown editor
4. Add voice command processing
5. Make settings button functional
