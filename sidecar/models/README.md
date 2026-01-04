# Whisper Models

Place your GGML-format Whisper models here.

## Download

For VoiceMark v0.1, we recommend the `small.en` model:

```bash
# From the sidecar directory:
curl -L -o models/ggml-small.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin
```

## Available Models

| Model     | Size   | Speed | Accuracy |
|-----------|--------|-------|----------|
| tiny.en   | 75 MB  | Fast  | Low      |
| base.en   | 142 MB | Good  | Good     |
| small.en  | 466 MB | Slow  | Better   |
| medium.en | 1.5 GB | Slow  | Best     |

For development, `tiny.en` is fastest. For production, `small.en` recommended (default).
