# VoiceMark Calibration Process (v0.1)

VoiceMark uses a short **guided calibration** to improve reliability for *your* voice and command phrasing.
This is **not model training**; it builds a deterministic **normalisation layer** from observed ASR outputs.

Standard command prefix: **“VoiceMark …”** (also accept **“Voice Mark …”**).

---

## Goals
Calibration improves:
- Recognition of command phrases (esp. **make/unmake** + styles)
- Accent- and speaker-specific substitutions
- Disambiguation of similar-sounding words (e.g., *italic* vs *metallic*)
- Confidence thresholds for destructive operations

---

## When to run calibration
- First launch
- After changing microphone
- After changing ASR model
- Manually: Settings → Calibration

---

## Step 1 — Guided reading (3 repeats)

The app asks you to read each block **three times** at normal pace.

### Block A — Formatting commands
1. VoiceMark make bold  
2. VoiceMark unmake bold  
3. VoiceMark make italic  
4. VoiceMark unmake italic  
5. VoiceMark make underline  
6. VoiceMark unmake underline  

### Block B — Layout & editing
1. VoiceMark new line  
2. VoiceMark new paragraph  
3. VoiceMark delete last word  
4. VoiceMark delete last sentence  
5. VoiceMark delete last 5 words  
6. VoiceMark delete everything after the word budget  

### Block C — Natural paragraph
Read the following paragraph three times (shown on screen):

> I reviewed the budget and the notes, and I changed the wording.  
> With VoiceMark, I can dictate a paragraph, then unmake bold, and make italic.  
> After that, I added a comma, a full stop, and a new paragraph.

(We can swap this for a UK-optimised passage later; v0.1 just needs consistent coverage.)

---

## Step 2 — Capture raw ASR output
For each expected phrase, store a record containing the *expected* string and the *heard* string (raw ASR),
plus any confidence or timing metadata the ASR provides.

Example record:
```json
{
  "expected": "voicemark unmake italic",
  "heard": "voice mark and make it metallic",
  "confidence": 0.73,
  "ts": "2025-12-31T10:00:00Z"
}
```

Store results at:
- `~/.voicemark/calibration/session-YYYYMMDD-HHMMSS.json`

---

## Step 3 — Derive normalisation candidates
Compute candidate substitutions by comparing expected vs heard across repetitions.

Typical patterns:
- Prefix variants: `voice mark` → `voicemark`
- Command repairs (prefix-gated):
  - `and make` → `unmake` (only before bold/italic/underline)
  - `make it` → `unmake` (only before bold/italic/underline)
- Style repairs (prefix-gated):
  - `metallic` → `italic` (only in formatting commands)

---

## Step 4 — Classify rule safety
Each rule gets a safety level:

- **safe**: always apply in command context
- **guarded**: apply only when followed by an expected token (e.g., a style name)
- **confirm**: requires user confirmation before executing a destructive command

Recommendation for v0.1:
- Apply substitutions only **after prefix detection**
- Keep destructive actions undoable, and confirm when target matching is fuzzy

---

## Step 5 — Persist rules
Write the resulting rule set to:
- `~/.voicemark/normalisation.json`

This file is:
- user-specific
- versioned
- editable (advanced users)
- reloaded at startup

---

## Success criteria
Calibration is successful if:
- Formatting commands reliably distinguish make/unmake
- “italic” is not mis-parsed as “metallic” after normalisation
- “VoiceMark/Voice Mark” prefix detection is consistent
- Delete-after commands are never executed without prefix + undo safety
