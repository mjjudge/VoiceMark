# ADR-004: Docker-Based Agent Development

**Date**: 2025-12-31

**Status**: Accepted

## Context

VoiceMark will be developed with assistance from both human developers and AI agents. We need a consistent development environment that works for both, ensures reproducibility, and supports automated workflows for linting, testing, and documentation.

## Decision

We will use **Docker containers** for all development tasks:

1. Separate containers for lint, test, and documentation tasks
2. Multi-stage Dockerfile for optimized builds
3. Docker Compose for orchestration
4. All development tools containerized

## Rationale

### Consistency

- Same environment for all developers (human and AI)
- Eliminates "works on my machine" problems
- Consistent behavior across different host systems
- Reproducible builds

### Isolation

- Dependencies don't pollute host system
- Multiple versions of tools can coexist
- Easy cleanup and reset
- Prevents conflicts with other projects

### Agent-Friendly

- AI agents can run tasks without system-specific setup
- Clear, consistent interfaces for automation
- Reduced setup complexity
- Easier to document and maintain

### Onboarding

- New developers can start quickly
- Minimal host system requirements
- Self-contained development environment
- Reduces setup documentation

## Architecture

### Service Structure

```yaml
services:
  lint:   # Code quality checks
  test:   # Test execution
  docs:   # Documentation generation
  dev:    # Interactive development
```

### Multi-Stage Build

```dockerfile
FROM ubuntu:22.04 as base
# Common dependencies

FROM base as lint
# Linting tools only

FROM base as test
# Testing tools only

FROM base as docs
# Documentation tools only

FROM base as dev
# All tools combined
```

## Consequences

### Positive

- Reproducible development environment
- Easy CI/CD integration
- Simplified agent workflows
- Clear separation of concerns
- Version-controlled tool configuration

### Negative

- Requires Docker installation
- Slightly more complex initial setup
- Container overhead (minimal on Linux)
- Need to understand Docker basics

### Neutral

- Additional abstraction layer
- Container images need periodic updates

## Implementation

### Tools Included

**Linting:**
- Python: black, flake8, pylint, mypy
- JavaScript: eslint, prettier
- Markdown: markdownlint-cli

**Testing:**
- pytest with coverage support
- pytest-mock for mocking

**Documentation:**
- mkdocs with material theme
- sphinx for API documentation

### Usage Patterns

```bash
# Lint code
docker-compose run --rm lint black .

# Run tests
docker-compose run --rm test pytest

# Build docs
docker-compose run --rm docs mkdocs build

# Interactive development
docker-compose run --rm dev bash
```

## System Requirements

### Minimum

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM
- 10GB disk space

### Recommended

- Docker Engine 24.0+
- Docker Compose 2.20+
- 8GB RAM
- 20GB disk space

## Alternatives Considered

### Virtual Environments (venv/virtualenv)

**Rejected**: 
- Less isolation
- Language-specific
- Harder to ensure consistency
- More complex for AI agents

### Conda Environments

**Rejected**:
- Python-focused
- Heavier than needed
- Slower environment creation
- Less suitable for containerization

### Native Installation

**Rejected**:
- Inconsistent across systems
- Hard to document all variations
- Difficult for AI agents
- Potential conflicts

## Migration Path

### Phase 1 (Current)

- Basic Docker setup
- Core development tasks containerized
- Documentation for common workflows

### Phase 2

- Add pre-commit hooks
- Integrate with CI/CD
- Optimize image sizes
- Add development containers for IDEs

### Phase 3

- Add production containers
- Container registry setup
- Kubernetes deployment (if needed)

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
