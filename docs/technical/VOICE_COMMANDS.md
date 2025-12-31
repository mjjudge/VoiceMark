# VoiceMark Commands

VoiceMark supports **voice-driven formatting and editing** inside its own Markdown editor.

Key design goals:
- **Safety** for destructive edits (confirmation + undo).
- **Deterministic** operations (commands become structured ops).
- **Locale-aware** command vocabulary (British vs US phrases).
- **Markdown-first formatting** (bold/italic/underline via Markdown conventions).

---

## 1) Command activation

VoiceMark recognises commands using either:

### A. Prefix mode (default)
A short prefix reduces accidental commands in normal dictation.

- Prefix: **"command"**
- Optional alias: **"voicemark"**

Examples:
- “voicemark delete last word”
- “voicemark new paragraph”
- “command make bold”

### B. Command mode toggle (optional)
In-app toggle puts the recogniser into command-only interpretation.

---

## 2) Locale packs (British vs US)

A *locale pack* is a dictionary of phrases that map to the same intent.

Example (punctuation):
- British: “full stop”
- US: “period”

You can expose:
- `locale = en-GB` or `en-US`
- `enable_us_aliases` boolean (lets Brits keep “period” off)

**Recommendation:** default to `en-GB` with `enable_us_aliases=false`.

---

## 3) Document model & formatting strategy

VoiceMark stores notes in **Markdown**.

### Supported formatting (v0.1)
- Bold: `**text**`
- Italic: `*text*`
- Underline: not standard Markdown. Options:
  1) HTML tags: `<u>text</u>` (recommended for fidelity)
  2) Custom syntax: `__text__` (conflicts with common Markdown bold)

**Recommendation:** use `<u>…</u>` for underline.

### What gets formatted?
Commands operate on the “active span” in this order:
1) If there is a selection in the editor: apply to selection.
2) Else apply to the **last dictated span** (the last committed insertion).
3) Else apply to the **last word** as a fallback.

This avoids needing cursor injection into other apps.

---

## 4) Command grammar

### High-level EBNF

```
CommandUtterance := Prefix WS Command
Prefix           := ("command" | "voicemark") ;
Command          := EditCmd | FormatCmd | PunctCmd | UtilityCmd ;

EditCmd          := "delete" WS ( "last word"
                               | "last sentence"
                               | ("last" WS Int WS "words")
                               | ("everything after" WS ("word"|"phrase") WS Target)
                               )
                  | ("undo" | "redo") ;

FormatCmd        := ("make" | "unmake" | "toggle") WS ( "bold" | "italic" | "underline" ) ;

PunctCmd         := PunctToken | LayoutToken ;
PunctToken       := "comma" | "full stop" | "question mark" | "exclamation mark"
                  | "colon" | "semicolon" | "dash" | "hyphen" | "open quote" | "close quote" ;

LayoutToken      := "new line" | "new paragraph" ;

UtilityCmd       := "clear document" | "save note" | "stop recording" ;

Target           := Quoted | Unquoted ;
Quoted           := '"' {any} '"' ;
Unquoted         := {any} ;   // trimmed; may include spaces
```

### Parsing notes
- Prefer **exact matches** for the command head (e.g., `delete last word`).
- For `Target`, allow either quoted text or “rest of utterance”.

---

## 5) Normalisation rules

Before matching, normalise the transcript:
- Lowercase
- Collapse repeated whitespace
- Strip leading/trailing whitespace
- Replace “full stop”/“period” based on locale pack
- Optionally map common ASR confusions (e.g., “new paragraph” → “new paragraf”)

Use **two-pass parsing**:
1) Try strict match (high precision)
2) Try fuzzy match with small edit distance for known phrases (still gated by prefix)

---

## 6) Operation model (structured ops)

Commands compile to ops that mutate the document buffer.

### Rust sketch

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Op {
  InsertText { text: String, source: InsertSource },
  InsertPunctuation { punct: Punct },
  InsertNewLine,
  InsertNewParagraph,

  DeleteLastWord,
  DeleteLastSentence,
  DeleteLastWords { n: usize },
  DeleteAfter { target: String, occurrence: Occurrence },

  Format { style: Style, scope: Scope, action: FormatAction },

  ClearDocument,

  Undo,
  Redo,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Style { Bold, Italic, Underline }

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum FormatAction { Make, Unmake, Toggle }

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Scope {
  Selection,
  LastDictatedSpan,
  LastWord,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Occurrence { Last, First }

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Punct { Comma, FullStop, QuestionMark, ExclamationMark, Colon, Semicolon, Dash, Hyphen, OpenQuote, CloseQuote }

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum InsertSource { Dictation, Command }
```

### Spacing rules for punctuation
- No space before: `, . ? ! : ;`
- One space after, unless followed by newline/end
- Quotes: apply locale style (straight vs curly) at render time, or store literal chars.

---

## 7) Safety rules

Destructive operations should be safe by default:

- Always maintain an **undo stack**.
- For `DeleteAfter { target }`:
  - If target not found → no-op + toast “Couldn’t find ‘…’”
  - If fuzzy match score < threshold → require confirmation
  - Optionally show preview: “Will delete 37 chars. Confirm?”

---

## 8) Punctuation tokens (locale-aware)

### en-GB default phrases
- comma
- full stop
- question mark
- exclamation mark
- colon
- semicolon
- dash / hyphen
- new line
- new paragraph

### Optional en-US aliases
- period (→ full stop)
- new paragraph (same)
- etc.

---

## 9) Formatting commands in Markdown

### Make/unmake/toggle semantics
- **Make bold**: wrap target with `**…**` if not already bold
- **Unmake bold**: remove surrounding `**` if present
- **Toggle bold**: make if absent, else unmake

Similar for italic using `*…*`.

Underline:
- Make: wrap with `<u>…</u>`
- Unmake: remove `<u>` tags if present (handle `<u>`…`</u>` only; do not strip arbitrary HTML)
- Toggle: make/unmake

---

## 10) Examples

- “voicemark comma” → insert `,`
- “command new paragraph” → insert `\n\n`
- “command delete last sentence” → delete back to last `.?!` boundary
- “command delete everything after the word budget” → find last “budget”, delete to end
- “command make bold” → apply bold to selection/last-span
- “command unmake italic” → remove italic markers
