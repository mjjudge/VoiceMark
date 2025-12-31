# VoiceMark dev container (lint/test/docs)
FROM debian:bookworm

ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000

RUN apt-get update && apt-get install -y --no-install-recommends     ca-certificates curl git build-essential pkg-config python3 libssl-dev     && rm -rf /var/lib/apt/lists/*

# Node LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -  && apt-get update && apt-get install -y --no-install-recommends nodejs  && rm -rf /var/lib/apt/lists/*

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Non-root user
RUN groupadd --gid ${USER_GID} ${USERNAME}  && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME}

WORKDIR /work
USER ${USERNAME}
ENV PATH="/home/${USERNAME}/.cargo/bin:${PATH}"
RUN rustup default stable

CMD ["bash"]
