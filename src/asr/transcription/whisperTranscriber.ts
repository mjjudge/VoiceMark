/**
 * Whisper Transcriber - connects to the Rust sidecar for real transcription.
 *
 * Uses the POST /transcribe endpoint of voicemark-sidecar.
 */

import type { Transcriber, TranscribeOptions } from './types';

/** Default sidecar URL (can be overridden via environment) */
const SIDECAR_URL = import.meta.env.VITE_SIDECAR_URL ?? 'http://localhost:3001';

/** Transcription endpoint */
const TRANSCRIBE_ENDPOINT = `${SIDECAR_URL}/transcribe`;

/** Health check endpoint */
const HEALTH_ENDPOINT = `${SIDECAR_URL}/health`;

/**
 * Response from the sidecar /transcribe endpoint.
 */
interface TranscribeResponse {
  text: string;
  segments: number;
}

/**
 * Response from the sidecar /health endpoint.
 */
interface HealthResponse {
  ok: boolean;
  model_loaded: boolean;
}

/**
 * Check if the sidecar is healthy and ready to transcribe.
 */
export async function checkSidecarHealth(): Promise<HealthResponse> {
  const response = await fetch(HEALTH_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Sidecar health check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Whisper transcriber implementation.
 *
 * Sends audio blobs to the sidecar for transcription via whisper.cpp.
 */
export const whisperTranscriber: Transcriber = {
  async transcribe(blob: Blob, opts?: TranscribeOptions): Promise<string> {
    const signal = opts?.signal;

    // Create multipart form data
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');

    // Make the request
    const response = await fetch(TRANSCRIBE_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal,
    });

    // Check for abort
    if (signal?.aborted) {
      throw new DOMException('Transcription aborted', 'AbortError');
    }

    // Handle errors
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error ?? errorBody;
      } catch {
        errorMessage = errorBody;
      }
      throw new Error(`Transcription failed: ${errorMessage}`);
    }

    // Parse response
    const result: TranscribeResponse = await response.json();
    return result.text;
  },
};

export default whisperTranscriber;
