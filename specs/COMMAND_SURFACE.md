# Tauri Command Surface (Draft)

## Transcription
- `transcribe_file({ path, model_id, language, prompt, diarize })`
- `transcribe_recording({ recording_id, ... })`
- `get_transcription_status({ job_id })`

## Recording
- `record_start({ device_id, sample_rate })`
- `record_stop()`
- `list_input_devices()`

## Personalisation
- `add_vocab({ term, hint, category })`
- `list_vocab()`
- `save_correction({ transcript_id, before, after, start_ms, end_ms })`

## Models
- `list_models()`
- `download_model({ model_id })`
- `set_active_model({ model_id })`
