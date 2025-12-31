# VoiceMark Agent Development Guide

This document describes the agent-based development workflow for VoiceMark.

## Overview

VoiceMark uses containerized development environments to ensure consistency across linting, testing, and documentation generation tasks. This approach allows both human developers and AI agents to work in reproducible environments.

## Docker-Based Development

All development tasks are containerized using Docker. This ensures:

- **Consistency**: Same environment across all development machines
- **Isolation**: Dependencies don't conflict with host system
- **Reproducibility**: Easy onboarding for new developers and agents

## Available Services

### Lint Service

Runs code quality checks and linters.

```bash
docker-compose run --rm lint
```

### Test Service

Executes the test suite.

```bash
docker-compose run --rm test
```

### Docs Service

Generates and validates documentation.

```bash
docker-compose run --rm docs
```

## Agent Workflows

### Code Quality Agent

```bash
# Check code quality
docker-compose run --rm lint

# Auto-fix issues (if supported)
docker-compose run --rm lint --fix
```

### Testing Agent

```bash
# Run all tests
docker-compose run --rm test

# Run specific test suite
docker-compose run --rm test -- path/to/tests

# Run with coverage
docker-compose run --rm test --coverage
```

### Documentation Agent

```bash
# Generate documentation
docker-compose run --rm docs build

# Validate documentation
docker-compose run --rm docs validate

# Serve documentation locally
docker-compose run --rm docs serve
```

## Development Environment Setup

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/mjjudge/VoiceMark.git
cd VoiceMark

# Build development containers
docker-compose build

# Verify setup
docker-compose run --rm lint --version
docker-compose run --rm test --version
docker-compose run --rm docs --version
```

## Project Structure

```
VoiceMark/
├── docs/                   # Documentation
│   ├── architecture/       # Architecture documentation
│   ├── functional/         # Functional specifications
│   ├── technical/          # Technical guides
│   ├── decisions/          # ADRs (Architecture Decision Records)
│   └── diagrams/           # System diagrams
├── specs/                  # Detailed specifications
├── Dockerfile              # Development container definition
├── docker-compose.yml      # Service orchestration
└── README.md               # Project overview
```

## Best Practices

### For Agents

1. **Always use Docker containers** for consistency
2. **Run linters before committing** code changes
3. **Run tests** to validate changes
4. **Update documentation** when changing functionality
5. **Follow ADR process** for architectural decisions

### For Documentation

1. Use Markdown format for all documentation
2. Keep ADRs immutable (add new ones instead of editing)
3. Include diagrams for complex concepts
4. Link related documents

### For Testing

1. Write tests before implementation (TDD)
2. Maintain high test coverage
3. Use descriptive test names
4. Test edge cases and error conditions

## Continuous Integration

(To be implemented)

The CI pipeline will automatically:
- Run linters on all pull requests
- Execute test suite
- Build and validate documentation
- Check for security vulnerabilities

## Troubleshooting

### Docker Issues

```bash
# Rebuild containers from scratch
docker-compose build --no-cache

# Clean up old containers and volumes
docker-compose down -v
docker system prune -f
```

### Permission Issues

Ensure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [VoiceMark Architecture](docs/architecture/)
- [VoiceMark ADRs](docs/decisions/)
