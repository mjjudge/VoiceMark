# UI Specification (v0.1)

VoiceMark v0.1 is a **single-window** desktop app for in-app dictation into a **Markdown-backed editor**.
It must support **realtime transcript display**, **manual editing**, and **manual formatting** (bold/italic/underline).

Standard command prefix: **“VoiceMark …”** (also accept **“Voice Mark …”**).

---

## 1. Window layout

### Main window (default)
A single window with three vertical regions:

1) **Header / Toolbar**
- App name: VoiceMark
- Model selector (dropdown)
- Locale: `en-GB` (default), plus toggle “Enable US aliases”
- Settings button (opens modal)

2) **Body**
- **Live Dictation Panel** (top)
  - Shows *ephemeral* text streaming in realtime while recording.
  - Visually distinct to indicate “not yet committed”.
  - Optional small waveform / level meter.
- **Markdown Editor** (bottom, primary)
  - Rich editing experience (selection, cursor navigation)
  - Formatting toolbar: **B**, *I*, <u>U</u>
  - Keyboard shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I, Ctrl/Cmd+U
  - Stores content as Markdown (underline serialises to `<u>…</u>`)

3) **Footer / Controls**
- Record / Stop button (large)
- “Auto-commit on stop” toggle (default ON)
- “Command mode” toggle (optional; default OFF)
- Status text: model loaded, mic ready, etc.

---

## 2. Core states

### Idle
- Record enabled
- Live panel empty or shows “Ready”
- Editor editable

### Recording
- Record button changes to Stop
- Live panel updates continuously
- Editor remains editable
- Optional: caret stays where insert will occur (but user can move cursor)

### Transcribing (if async)
- Live panel shows “Transcribing…” + partial results
- Record disabled until stable (or allow queueing)
- Editor still usable

### Error
- Non-blocking toast and inline status
- Errors include: mic denied, model missing, sidecar failed

---

## 3. Realtime transcript behaviour

VoiceMark provides real-time streaming transcription via WebSocket connection to the sidecar.

### Streaming architecture
- Audio captured via AudioWorklet at 16kHz mono
- PCM samples sent to sidecar WebSocket (`/stream`)
- Audio is transcribed in 6-second chunks (auto-committed as finals)
- Partial transcriptions sent every ~500ms during dictation

### Buffers

1) **Ephemeral transcript (partials)**
- Updated from ASR partial results during dictation
- Shows work-in-progress text in Live Dictation Panel
- Cleared when corresponding final arrives

2) **Committed document insertion (finals)**
- Finals are routed to the Markdown editor immediately
- Each final is appended at cursor position
- The insertion range is recorded as **LastDictatedSpan**

### Merge rules
- Partial results update the ephemeral panel (replace-last strategy)
- Finals are accumulated and inserted into the editor
- Spacing between finals is handled automatically (no double spaces)

---

## 4. Manual editing & formatting

### Manual editing (required)
- Click to position cursor
- Select text (mouse/keyboard)
- Standard copy/paste
- Undo/redo

### Manual formatting (required)
- Bold / Italic / Underline via toolbar + shortcuts
- Formatting applies to selection
- If no selection, applies to “current word” or toggles style at caret (editor-native)

### Storage format
- Bold: `**text**`
- Italic: `*text*`
- Underline: `<u>text</u>`

---

## 5. Voice command integration with the editor

Voice commands compile to editor operations (transactions). Scope order:
1) Current selection
2) LastDictatedSpan
3) Last word

### Examples
- “VoiceMark make bold” → apply bold to selection / last span / last word
- “VoiceMark delete last sentence” → delete to sentence boundary (editor-aware)
- “VoiceMark new paragraph” → insert `\n\n`
- “VoiceMark comma” → insert `,` with spacing rules

---

## 6. Accessibility & ergonomics (v0.1)
- Clear “Recording” indicator (icon + text)
- Keyboard navigation for all controls
- Large hit targets for Record/Stop

---

## 7. Non-goals for v0.1
- OS-wide dictation into other apps
- Global system hotkeys
- Multi-window note management (can be v0.2)
