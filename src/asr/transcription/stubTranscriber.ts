/**
 * Stub Transcriber
 * 
 * A placeholder transcription implementation for development and testing.
 * Returns a descriptive string about the audio blob instead of real transcription.
 * 
 * This will be replaced with real Whisper.cpp integration in production.
 */

import type { Transcriber, TranscribeOptions } from './types';

/**
 * Stub transcriber implementation
 * 
 * Provides placeholder transcription results for testing the audio pipeline.
 * Respects abort signals for proper cancellation behavior.
 */
export const stubTranscriber: Transcriber = {
  async transcribe(blob: Blob, opts?: TranscribeOptions): Promise<string> {
    // Check if already aborted
    if (opts?.signal?.aborted) {
      throw new DOMException('Transcription aborted', 'AbortError');
    }
    
    // Simulate some processing time (100-300ms)
    const delay = 100 + Math.random() * 200;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);
      
      // Handle abort during the delay
      opts?.signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new DOMException('Transcription aborted', 'AbortError'));
      }, { once: true });
    });
    
    // Check abort again after delay
    if (opts?.signal?.aborted) {
      throw new DOMException('Transcription aborted', 'AbortError');
    }
    
    // Estimate audio duration (rough: ~16KB/s for 16kHz mono audio)
    const seconds = Math.max(1, Math.round(blob.size / 16000));
    const mimeType = blob.type || 'unknown';
    const sizeKB = Math.round(blob.size / 1024);
    
    return `(stub) transcribed ~${seconds}s audio (${mimeType}, ${sizeKB}KB)`;
  }
};
