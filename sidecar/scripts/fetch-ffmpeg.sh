#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/resources/ffmpeg/linux-x86_64"
mkdir -p "$DEST"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# John Van Sickle static release build (amd64)
URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"

echo "Downloading ffmpeg from: $URL"
curl -L "$URL" -o "$TMP/ffmpeg.tar.xz"

tar -xf "$TMP/ffmpeg.tar.xz" -C "$TMP"
FFMPEG_BIN="$(find "$TMP" -type f -name ffmpeg -perm -111 | head -n 1)"

if [[ -z "${FFMPEG_BIN:-}" ]]; then
  echo "Could not find ffmpeg binary in archive"
  exit 1
fi

cp "$FFMPEG_BIN" "$DEST/ffmpeg"
chmod +x "$DEST/ffmpeg"

echo "Bundled ffmpeg at: $DEST/ffmpeg"
"$DEST/ffmpeg" -version | head -n 1

# sanity: should run without missing libs; ldd prints "not a dynamic executable" for fully static
ldd "$DEST/ffmpeg" || true
