# VoiceMark Development Container
# Multi-stage build for lint, test, and documentation services

FROM ubuntu:22.04 as base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install common dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy project files
COPY . /workspace/

# Lint stage
FROM base as lint

# Install linting tools
RUN pip3 install --no-cache-dir \
    pylint \
    flake8 \
    black \
    isort \
    mypy

RUN npm install -g \
    eslint \
    prettier \
    markdownlint-cli

# Set entrypoint for linting
ENTRYPOINT ["echo", "Lint service ready. Run specific linters as needed."]

# Test stage
FROM base as test

# Install testing frameworks
RUN pip3 install --no-cache-dir \
    pytest \
    pytest-cov \
    pytest-mock

# Set entrypoint for testing
ENTRYPOINT ["echo", "Test service ready. Run pytest or other test commands."]

# Documentation stage
FROM base as docs

# Install documentation tools
RUN pip3 install --no-cache-dir \
    mkdocs \
    mkdocs-material \
    sphinx \
    sphinx-rtd-theme

# Set entrypoint for documentation
ENTRYPOINT ["echo", "Docs service ready. Use mkdocs or sphinx commands."]

# Default stage for general development
FROM base as dev

# Install all tools
RUN pip3 install --no-cache-dir \
    pylint \
    flake8 \
    black \
    isort \
    mypy \
    pytest \
    pytest-cov \
    pytest-mock \
    mkdocs \
    mkdocs-material \
    sphinx \
    sphinx-rtd-theme

RUN npm install -g \
    eslint \
    prettier \
    markdownlint-cli

# Default command
CMD ["/bin/bash"]
