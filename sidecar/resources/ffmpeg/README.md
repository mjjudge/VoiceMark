# Bundled FFmpeg

Place platform-specific ffmpeg binaries here for bundled distribution.

## Directory Structure

```
resources/ffmpeg/
  linux-x86_64/ffmpeg
  darwin-x86_64/ffmpeg
  win-x86_64/ffmpeg.exe
```

## Development

During development, the sidecar falls back to system `ffmpeg` if bundled binaries aren't present.

Make sure ffmpeg is installed:

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

## Production Bundling

For release builds, download static ffmpeg binaries and place them here.

- Linux: https://johnvansickle.com/ffmpeg/
- macOS: https://evermeet.cx/ffmpeg/
- Windows: https://www.gyan.dev/ffmpeg/builds/
