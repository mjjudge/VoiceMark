# Docker Setup for VoiceMark

This document provides detailed instructions for setting up and using Docker with VoiceMark.

## Prerequisites

### Install Docker

#### Ubuntu

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin
```

#### Verify Installation

```bash
docker --version
docker compose version
```

### Post-Installation Steps

Add your user to the docker group to run Docker without sudo:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Building the Development Environment

### Build All Services

```bash
cd /path/to/VoiceMark
docker-compose build
```

### Build Specific Service

```bash
docker-compose build lint
docker-compose build test
docker-compose build docs
docker-compose build dev
```

## Using the Services

### Lint Service

Run linters on your code:

```bash
# Python linting
docker-compose run --rm lint black --check .
docker-compose run --rm lint flake8 .
docker-compose run --rm lint pylint src/

# Markdown linting
docker-compose run --rm lint markdownlint-cli docs/ README.md

# Auto-fix with black
docker-compose run --rm lint black .
```

### Test Service

Run tests:

```bash
# Run all tests
docker-compose run --rm test pytest

# Run specific test file
docker-compose run --rm test pytest tests/test_example.py

# Run with coverage
docker-compose run --rm test pytest --cov=src --cov-report=html

# Run with verbose output
docker-compose run --rm test pytest -v
```

### Documentation Service

Build and serve documentation:

```bash
# Build documentation
docker-compose run --rm docs mkdocs build

# Serve documentation locally (accessible at http://localhost:8000)
docker-compose up docs

# Stop the docs server
docker-compose down
```

### Development Service

Interactive development environment:

```bash
# Start interactive shell
docker-compose run --rm dev

# Run a specific command
docker-compose run --rm dev python3 --version
docker-compose run --rm dev git status
```

## Common Workflows

### Before Committing Code

```bash
# 1. Format code
docker-compose run --rm lint black .

# 2. Run linters
docker-compose run --rm lint flake8 .
docker-compose run --rm lint markdownlint-cli docs/

# 3. Run tests
docker-compose run --rm test pytest

# 4. If all pass, commit your changes
git add .
git commit -m "Your commit message"
```

### Updating Documentation

```bash
# 1. Edit documentation files
vim docs/technical/some-doc.md

# 2. Validate markdown
docker-compose run --rm lint markdownlint-cli docs/

# 3. Build documentation
docker-compose run --rm docs mkdocs build

# 4. Preview locally
docker-compose up docs
# Visit http://localhost:8000

# 5. Stop server and commit
docker-compose down
git add docs/
git commit -m "Update documentation"
```

## Troubleshooting

### Container Build Fails

```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache

# Check Docker disk space
docker system df

# Clean up unused resources
docker system prune -a
```

### Permission Denied Errors

```bash
# Ensure you're in the docker group
groups | grep docker

# If not, add yourself and log out/in
sudo usermod -aG docker $USER
```

### Port Already in Use

If port 8000 is already in use for the docs service:

```bash
# Edit docker-compose.yml and change the port mapping
# From: "8000:8000"
# To:   "8080:8000"

# Or stop the conflicting service
sudo lsof -i :8000
sudo kill <PID>
```

### Volumes Not Updating

```bash
# Remove volumes and rebuild
docker-compose down -v
docker-compose build
```

## Performance Tips

### Speed Up Builds

1. Use `.dockerignore` to exclude unnecessary files
2. Order Dockerfile commands from least to most frequently changing
3. Use multi-stage builds (already implemented)

### Reduce Image Size

```bash
# View image sizes
docker images | grep voicemark

# Remove unused images
docker image prune -a
```

## Advanced Usage

### Running Multiple Instances

```bash
# Start multiple services simultaneously
docker-compose up -d lint test docs

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f docs

# Stop all services
docker-compose down
```

### Custom Commands

```bash
# Execute arbitrary commands in containers
docker-compose run --rm dev bash -c "echo 'Hello from VoiceMark'"

# Chain multiple commands
docker-compose run --rm lint sh -c "black . && flake8 ."
```

### Debugging

```bash
# Start container with shell access
docker-compose run --rm dev /bin/bash

# Inside container, run commands manually
$ python3 --version
$ pip3 list
$ pytest --version
```

## Security Considerations

1. **Keep base images updated**: Regularly rebuild with latest Ubuntu LTS
2. **Scan for vulnerabilities**: Use `docker scan` if available
3. **Minimize installed packages**: Only install what's necessary
4. **Don't store secrets in images**: Use environment variables or secrets management

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
