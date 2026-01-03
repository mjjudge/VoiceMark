/**
 * Transcriber Interface
 * 
 * Defines the contract for transcription implementations.
 * This abstraction allows swapping between different transcription backends:
 * - stubTranscriber: Returns placeholder text for testing
 * - whisperTranscriber: Real Whisper.cpp integration (future)
 * - webSpeechTranscriber: Browser Web Speech API (future)
 */

/**
 * Options for transcription
 */
export interface TranscribeOptions {
  /** AbortSignal for cancellation support */
  signal?: AbortSignal;
  /** Language hint (e.g., 'en', 'en-GB') */
  language?: string;
  /** Prompt/context for better transcription */
  prompt?: string;
}

/**
 * Transcriber interface
 * 
 * All transcription implementations must conform to this interface.
 * The transcribe method takes an audio Blob and returns the transcribed text.
 */
export interface Transcriber {
  /**
   * Transcribe an audio blob to text.
   * 
   * @param blob - Audio data to transcribe
   * @param opts - Optional configuration (abort signal, language, etc.)
   * @returns Promise resolving to transcribed text
   * @throws If aborted or transcription fails
   */
  transcribe(blob: Blob, opts?: TranscribeOptions): Promise<string>;
}
