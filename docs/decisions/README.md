# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for VoiceMark. ADRs document significant architectural decisions made during the development of the project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help teams:

- Understand why decisions were made
- Avoid revisiting settled issues
- Onboard new team members
- Maintain consistency across the project

## ADR Format

Each ADR follows this structure:

1. **Title**: Short descriptive name
2. **Date**: When the decision was made
3. **Status**: Proposed, Accepted, Deprecated, Superseded
4. **Context**: Background and problem statement
5. **Decision**: What was decided
6. **Rationale**: Why this decision was made
7. **Consequences**: Expected outcomes (positive and negative)
8. **Alternatives Considered**: Other options that were evaluated
9. **References**: Links to relevant resources

## Index of ADRs

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [ADR-001](ADR-001-docs-first-approach.md) | Docs-First Development Approach | Accepted | 2025-12-31 |
| [ADR-002](ADR-002-offline-first-architecture.md) | Offline-First Architecture | Accepted | 2025-12-31 |
| [ADR-003](ADR-003-markdown-storage.md) | Markdown for Note Storage | Accepted | 2025-12-31 |
| [ADR-004](ADR-004-docker-agent-development.md) | Docker-Based Agent Development | Accepted | 2025-12-31 |

## Creating a New ADR

When creating a new ADR:

1. Use the next available number (ADR-XXX)
2. Use descriptive filename: `ADR-XXX-short-title.md`
3. Follow the template structure
4. Update this index file
5. Get review from team before marking as "Accepted"

## ADR Lifecycle

### Proposed

- Initial draft of the decision
- Under discussion and review
- May be revised based on feedback

### Accepted

- Decision has been approved
- Implementation should follow this decision
- Document is now immutable (don't edit)

### Deprecated

- Decision is no longer relevant
- Kept for historical reference
- Should note what replaced it

### Superseded

- Replaced by a newer ADR
- Link to the superseding ADR
- Kept for historical context

## Principles

1. **Immutability**: Once accepted, ADRs should not be modified (except for typos)
2. **Supersession**: To change a decision, create a new ADR that supersedes the old one
3. **Context**: Include enough context so readers understand the problem
4. **Transparency**: Document alternatives considered and trade-offs
5. **Brevity**: Keep ADRs concise and focused on the decision

## Resources

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)
