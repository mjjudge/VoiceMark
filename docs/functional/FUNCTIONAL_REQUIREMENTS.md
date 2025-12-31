# Functional Requirements
## VoiceMark Commands (MVP)

VoiceMark supports in-app dictation with **voice commands** for editing and formatting.

### Command activation
- Default: **Prefix mode** (“command …” / “voicemark …”)
- Optional: **Command mode toggle** in UI

### Locale support
- Default locale: **en-GB**
- Optional toggle to enable **en-US aliases** (e.g., “period”)

### Required commands (v0.1)
**Editing**
- command undo / redo
- command delete last word
- command delete last sentence
- command delete last N words (N: 2–20)
- command delete everything after the word/phrase <target>

**Layout & punctuation**
- command new line
- command new paragraph
- command comma / full stop / question mark / exclamation mark / colon / semicolon / dash / hyphen
- (optional) open quote / close quote

**Formatting (Markdown)**
- command make bold / unmake bold / toggle bold
- command make italic / unmake italic / toggle italic
- command make underline / unmake underline / toggle underline
  - Underline stored as `<u>…</u>` in Markdown.

### Formatting scope rules
Formatting commands apply to:
1) current selection, else
2) last dictated span, else
3) last word

### Safety
- All destructive commands must be reversible via **undo**.
- “Delete after <target>” must no-op with user feedback when <target> cannot be found.
