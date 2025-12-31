# ADR-003: Markdown for Note Storage

**Date**: 2025-12-31

**Status**: Accepted

## Context

VoiceMark needs a format for storing dictated notes that is:
- Human-readable
- Machine-parseable
- Future-proof
- Portable across platforms
- Suitable for version control

## Decision

All notes in VoiceMark will be stored as **Markdown** (`.md`) files.

## Rationale

### Human-Readable

- Plain text format that can be read without special tools
- No proprietary formats or binary data
- Can be edited with any text editor
- Renders nicely in many applications and platforms

### Portability

- Works across all operating systems
- No vendor lock-in
- Easy to migrate to other applications
- Can be processed by countless tools

### Version Control Friendly

- Text-based format works well with Git
- Easy to see diffs and track changes
- Supports collaborative editing
- Enables backups and synchronization

### Extensibility

- Supports rich formatting (headers, lists, links, etc.)
- Can embed metadata as frontmatter (YAML)
- Supports code blocks for technical notes
- Can include images and links

### Developer Experience

- Widely understood format
- Extensive tooling ecosystem
- Easy to generate and parse programmatically
- Supports automation and scripting

## File Organization

```
notes/
├── 2025/
│   ├── 12/
│   │   ├── 2025-12-31-meeting-notes.md
│   │   └── 2025-12-31-todo-list.md
│   └── ...
└── ...
```

### Naming Convention

Format: `YYYY-MM-DD-title.md`

Examples:
- `2025-12-31-team-standup.md`
- `2025-12-30-project-ideas.md`

## File Structure

Each note file includes:

```markdown
---
title: Meeting Notes
date: 2025-12-31
tags: [meeting, planning, team]
---

# Meeting Notes

## Attendees
- Person 1
- Person 2

## Discussion Points
...
```

## Consequences

### Positive

- Notes are portable and future-proof
- Easy integration with existing tools (VS Code, Obsidian, etc.)
- Version control works naturally
- Can easily generate HTML, PDF, or other formats
- Search and indexing are straightforward

### Negative

- Markdown has some formatting limitations
- Different Markdown flavors may cause minor incompatibilities
- Need to establish conventions for voice-specific formatting

### Neutral

- Users must learn basic Markdown syntax (low barrier)
- Need to implement Markdown parser for application

## Implementation

### Phase 1

- Use standard Markdown (CommonMark)
- Implement file-based storage
- Add basic metadata (frontmatter)

### Phase 2

- Add extended syntax support (tables, task lists)
- Implement full-text search
- Add export to PDF/HTML

## Alternatives Considered

### JSON/XML

**Rejected**: Not human-readable, harder to edit manually

### Rich Text Format (RTF)

**Rejected**: Binary format, less portable, harder to version control

### HTML

**Rejected**: Too verbose for note-taking, harder to write manually

### Plain Text

**Rejected**: Lacks structure and formatting capabilities

## References

- [CommonMark Specification](https://commonmark.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Markdown Guide](https://www.markdownguide.org/)
