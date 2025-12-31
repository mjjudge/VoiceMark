# ADR-0001: Product scope and interaction model

## Status
Accepted

## Context
We want an offline dictation tool for Ubuntu and other desktop platforms. Dictating directly into arbitrary focused apps (OS-wide typing) and global hotkeys increase platform complexity (Wayland/X11, permissions, focus behavior).

## Decision
VoiceMark will (initially) support **in-app dictation** into a **Markdown editor**, with **voice commands** for editing/formatting. Global hotkeys and OS-wide text insertion are explicitly **out of scope** for v0.1.

## Consequences
- Cross-platform support is simpler and more reliable
- Voice-driven editing becomes a first-class capability
- Exports (DOCX/PDF) can be added later from Markdown
