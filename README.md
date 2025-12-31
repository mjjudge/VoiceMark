# VoiceMark

**Voice Mark** - A docs-first offline dictation application for Ubuntu

## Overview

VoiceMark is an offline dictation tool that allows you to convert speech to text without relying on cloud services. Notes are stored as Markdown files for easy management and portability.

## Command Prefix

The application responds to the following command prefixes:
- `VoiceMark`
- `Voice Mark`

## Features

- **Offline Operation**: No internet connection required
- **Markdown Storage**: All notes saved in Markdown format
- **Voice-First Interface**: Designed for hands-free operation
- **Privacy-Focused**: Your data stays on your machine

## Quick Start

### Prerequisites

- Ubuntu (latest LTS recommended)
- Docker and Docker Compose (for development)

### Running with Docker

```bash
docker-compose up
```

See [Docker Setup](docs/technical/docker-setup.md) for detailed instructions.

## Documentation

- **[Architecture](docs/architecture/)** - System design and architecture decisions
- **[Functional](docs/functional/)** - Functional specifications and requirements
- **[Technical](docs/technical/)** - Technical documentation and guides
- **[Decisions](docs/decisions/)** - Architecture Decision Records (ADRs)
- **[Diagrams](docs/diagrams/)** - Visual representations of system components
- **[Specifications](specs/)** - Detailed feature specifications

## Development

See [AGENTS.md](AGENTS.md) for information about agent-based development workflows.

## Version

Current version: **v0.1.0-alpha**

## License

TBD

## Contributing

TBD
