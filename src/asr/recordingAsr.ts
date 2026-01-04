/**
 * Recording ASR Engine
 * 
 * Real microphone capture implementation of the AsrEngine interface.
 * This engine captures audio from the user's microphone using the Web Audio API.
 * 
 * Current implementation:
 * - Requests microphone access via navigator.mediaDevices.getUserMedia
 * - Creates and manages a MediaRecorder for audio capture
 * - Runs audio through a pluggable Transcriber (stub by default)
 * 
 * Future enhancements:
 * - Integrate with Whisper.cpp for real-time transcription
 * - Process audio chunks for VAD (Voice Activity Detection)
 * - Stream audio to transcription backend or local inference
 * 
 * The audio chunks captured here will be the input for Whisper.cpp integration.
 * The MediaRecorder captures audio in chunks which can be:
 * 1. Accumulated and sent to Whisper for batch processing
 * 2. Processed in real-time for streaming transcription
 */

import type { AsrEventCallback, AsrEngine, AsrStartOptions } from './events';
import type { Transcriber } from './transcription/types';
import { stubTranscriber } from './transcription/stubTranscriber';

// Recording parameters
const AUDIO_CHUNK_INTERVAL_MS = 1000; // Collect audio in 1-second chunks
const INCREMENTAL_PROCESS_INTERVAL_MS = 3000; // Process accumulated chunks every 3 seconds for partial results
const MIN_CHUNK_SIZE_FOR_PARTIAL = 2; // Minimum chunks needed before processing partial

// Engine state
let isActive = false;
let eventCallback: AsrEventCallback | null = null;

// Cancellation support
let abortController: AbortController | null = null;

// Media resources (need explicit cleanup)
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;

// Track MIME type for final blob construction
let mimeTypeUsed = '';

// Timers
let incrementalProcessTimer: ReturnType<typeof setInterval> | null = null;

// Audio data storage (for transcription)
let audioChunks: Blob[] = [];
let processedChunkCount = 0; // Track how many chunks have been processed for partials

// Promise to wait for onstop event
let onStopPromise: Promise<void> | null = null;
let onStopResolve: (() => void) | null = null;

// Track if incremental processing is in progress
let isProcessing = false;

// Pluggable transcriber (default: stub)
let transcriber: Transcriber = stubTranscriber;

/**
 * Set the transcriber implementation.
 * 
 * Allows swapping the transcription backend without modifying engine internals.
 * Call this before starting recording to use a different transcriber.
 * 
 * @param t - The transcriber implementation to use
 */
export function setTranscriber(t: Transcriber): void {
  transcriber = t;
}

/**
 * Start the recording ASR engine.
 * 
 * Requests microphone access and begins capturing audio.
 * Emits placeholder events while recording (real transcription pending).
 * 
 * @param onEvent - Callback to receive ASR events
 * @param options - Optional configuration (e.g., deviceId for specific microphone)
 * @throws Error if microphone access is denied
 */
async function start(onEvent: AsrEventCallback, options?: AsrStartOptions): Promise<void> {
  // Clean up any existing session first
  stop();

  eventCallback = onEvent;
  audioChunks = [];
  
  // Create fresh abort controller for this session
  abortController = new AbortController();

  const deviceId = options?.deviceId;

  try {
    // Request microphone access
    // This will prompt the user for permission if not already granted
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    
    // If a specific device is requested, use it
    if (deviceId) {
      audioConstraints.deviceId = { exact: deviceId };
      console.log('[recordingAsr] Using device:', deviceId);
    }
    
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });
    
    // Log which device we got
    const audioTrack = mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      console.log('[recordingAsr] Active microphone:', audioTrack.label);
    }

    // Determine the best supported MIME type
    mimeTypeUsed = getSupportedMimeType();
    console.log('[recordingAsr] Selected MIME type:', mimeTypeUsed || '(browser default)');

    // Create MediaRecorder for audio capture
    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: mimeTypeUsed,
    });

    // Set up the onstop promise for synchronization
    onStopPromise = new Promise<void>((resolve) => {
      onStopResolve = resolve;
    });

    // Handle audio data chunks
    // These chunks will be sent to Whisper.cpp for transcription in future
    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      console.log('[recordingAsr] ondataavailable:', event.data.size, 'bytes, isActive:', isActive);
      if (event.data.size > 0 && isActive) {
        audioChunks.push(event.data);
        const totalBytes = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('[recordingAsr] Audio chunk received:', audioChunks.length, 'chunks,', Math.round(totalBytes / 1024), 'KB total');
      }
    };

    // Handle recording errors
    mediaRecorder.onerror = (event: Event) => {
      const error = event as ErrorEvent;
      if (eventCallback && isActive) {
        eventCallback({
          type: 'asr:error',
          message: `Recording error: ${error.message || 'Unknown error'}`,
        });
      }
    };

    // Handle recording stop - just resolve the promise, finalization happens in stop()
    mediaRecorder.onstop = () => {
      console.log('[recordingAsr] MediaRecorder onstop fired');
      if (onStopResolve) {
        onStopResolve();
        onStopResolve = null;
      }
    };

    // Start recording with chunked data collection
    console.log('[recordingAsr] Starting MediaRecorder with', AUDIO_CHUNK_INTERVAL_MS, 'ms chunks');
    console.log('[recordingAsr] MediaRecorder state before start:', mediaRecorder.state);
    mediaRecorder.start(AUDIO_CHUNK_INTERVAL_MS);
    console.log('[recordingAsr] MediaRecorder state after start:', mediaRecorder.state);
    isActive = true;

    // Emit recording status
    eventCallback({
      type: 'asr:status',
      state: 'recording',
      message: 'Microphone recording started',
    });

    // Start incremental processing for real-time partial results
    startIncrementalProcessing();

  } catch (error) {
    // Handle permission denied or other errors
    isActive = false;
    abortController = null;
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (eventCallback) {
      eventCallback({
        type: 'asr:error',
        message: `Microphone access failed: ${message}`,
      });
      eventCallback({
        type: 'asr:status',
        state: 'idle',
        message: 'Recording failed to start',
      });
    }
    
    // Clean up any partial resources
    cleanupMediaResources();
    eventCallback = null;
    
    throw error;
  }
}

/**
 * Process accumulated audio chunks incrementally for partial results.
 * 
 * This function is called periodically to transcribe accumulated audio
 * and emit partial results, providing real-time feedback to the user.
 * 
 * @param signal - AbortSignal for cancellation
 * @param callback - Event callback for emitting results
 * @param chunks - Audio chunks to transcribe
 * @param startIndex - Index of first chunk to process (for incremental)
 */
async function processChunks(
  signal: AbortSignal,
  callback: AsrEventCallback,
  chunks: Blob[],
  startIndex: number
): Promise<void> {
  // Check if we have new audio to transcribe
  if (chunks.length <= startIndex) {
    console.log('[recordingAsr] No new chunks to process');
    return;
  }
  
  // Check if already aborted
  if (signal.aborted) {
    console.log('[recordingAsr] Processing aborted before starting');
    return;
  }

  // Build blob from all chunks (including previously processed ones)
  // Note: We include all chunks for transcription context accuracy.
  // Whisper performs better with full audio context rather than processing
  // only incremental chunks. The trade-off is some redundant processing
  // for better transcription quality and continuity.
  const audioBlob = new Blob(chunks, { type: mimeTypeUsed });
  console.log('[recordingAsr] Processing chunks:', chunks.length, 'total,', audioBlob.size, 'bytes');

  try {
    // Run transcription
    const startTime = Date.now();
    const text = await transcriber.transcribe(audioBlob, { signal });
    const duration = Date.now() - startTime;
    
    console.log('[recordingAsr] Partial transcription completed in', duration, 'ms');
    
    // Check abort after transcription
    if (signal.aborted) {
      console.log('[recordingAsr] Processing aborted after completion');
      return;
    }

    // Emit partial transcription
    callback({
      type: 'asr:partial',
      text,
      ts: Date.now(),
    });

  } catch (error) {
    // Handle abort gracefully
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[recordingAsr] Processing was aborted');
      return;
    }
    
    // Handle other errors - log but don't stop recording
    // Emit a warning event for visibility without interrupting the flow
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.warn('[recordingAsr] Partial processing error:', message);
    
    callback({
      type: 'asr:error',
      message: `Partial transcription warning: ${message}`,
    });
  }
}

/**
 * Finalize recording and run transcription.
 * 
 * Builds a single blob from audio chunks, runs the transcriber,
 * and emits appropriate events.
 * 
 * @param signal - AbortSignal for cancellation
 * @param callback - Event callback for emitting results
 * @param chunks - Audio chunks to transcribe
 */
async function finalizeAndTranscribe(
  signal: AbortSignal,
  callback: AsrEventCallback,
  chunks: Blob[]
): Promise<void> {
  // Check if we have audio to transcribe
  if (chunks.length === 0) {
    console.log('[recordingAsr] No audio chunks to transcribe');
    return;
  }
  
  // Check if already aborted
  if (signal.aborted) {
    console.log('[recordingAsr] Transcription aborted before starting');
    return;
  }

  // Build final blob from chunks
  const finalBlob = new Blob(chunks, { type: mimeTypeUsed });
  console.log('[recordingAsr] Final blob:', finalBlob.size, 'bytes,', finalBlob.type);

  // Emit processing status
  callback({
    type: 'asr:status',
    state: 'processing',
    message: 'Transcribing audio...',
  });

  try {
    // Run transcription
    const startTime = Date.now();
    const text = await transcriber.transcribe(finalBlob, { signal });
    const duration = Date.now() - startTime;
    
    console.log('[recordingAsr] Transcription completed in', duration, 'ms');
    
    // Check abort after transcription (in case it was aborted during)
    if (signal.aborted) {
      console.log('[recordingAsr] Transcription aborted after completion');
      return;
    }

    // Emit final transcription
    callback({
      type: 'asr:final',
      text,
      ts: Date.now(),
    });

  } catch (error) {
    // Handle abort gracefully
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[recordingAsr] Transcription was aborted');
      return;
    }
    
    // Handle other errors
    const message = error instanceof Error ? error.message : 'Transcription failed';
    console.error('[recordingAsr] Transcription error:', message);
    
    callback({
      type: 'asr:error',
      message,
    });
  }
}

/**
 * Stop the recording ASR engine.
 * 
 * Stops recording, runs transcription, releases microphone, and cleans up all resources.
 * This is idempotent - safe to call multiple times.
 */
function stop(): void {
  // Capture current state before modifications
  const wasActive = isActive;
  const currentCallback = eventCallback;
  const currentChunks = [...audioChunks];
  const currentAbortController = abortController;
  const currentOnStopPromise = onStopPromise;

  // Immediately mark as inactive to prevent new events
  isActive = false;

  // Stop incremental processing
  if (incrementalProcessTimer) {
    clearInterval(incrementalProcessTimer);
    incrementalProcessTimer = null;
  }
  
  // Reset processing state
  processedChunkCount = 0;
  isProcessing = false;

  // Stop MediaRecorder if active
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      console.log('[recordingAsr] Stopping MediaRecorder');
      mediaRecorder.stop();
    } catch {
      // Ignore errors during stop - recorder may already be stopped
    }
  }

  // If we weren't active, just clean up
  if (!wasActive || !currentCallback) {
    cleanupMediaResources();
    eventCallback = null;
    audioChunks = [];
    abortController = null;
    onStopPromise = null;
    return;
  }

  // Wait for onstop, then finalize
  const finalize = async () => {
    // Wait for MediaRecorder to fully stop
    if (currentOnStopPromise) {
      await currentOnStopPromise;
    }

    // Finalize with transcription (if not aborted)
    if (currentAbortController && !currentAbortController.signal.aborted) {
      await finalizeAndTranscribe(
        currentAbortController.signal,
        currentCallback,
        currentChunks
      );
    }

    // Emit idle status
    currentCallback({
      type: 'asr:status',
      state: 'idle',
      message: 'Recording stopped',
    });

    // Final cleanup
    cleanupMediaResources();
  };

  // Run finalization async but don't block stop()
  finalize().catch((err) => {
    console.error('[recordingAsr] Finalization error:', err);
  });

  // Clear references immediately to prevent further use
  eventCallback = null;
  audioChunks = [];
  abortController = null;
  onStopPromise = null;
}

/**
 * Abort any in-progress transcription.
 * 
 * Call this to cancel transcription without waiting for it to complete.
 * Useful for quick stop without emitting final text.
 */
export function abort(): void {
  if (abortController) {
    console.log('[recordingAsr] Aborting transcription');
    abortController.abort();
  }
  stop();
}

/**
 * Clean up media stream and recorder resources.
 * Ensures tracks are stopped to release the microphone.
 */
function cleanupMediaResources(): void {
  // Stop all tracks in the media stream (releases microphone)
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStream = null;
  }

  // Clear recorder reference
  mediaRecorder = null;
}

/**
 * Get the best supported audio MIME type for MediaRecorder.
 * Prefers WebM with Opus codec for efficiency.
 */
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback to default (browser will choose)
  return '';
}

/**
 * Start incremental processing for real-time partial results.
 * 
 * Periodically processes accumulated audio chunks and emits partial
 * transcription results, providing real-time feedback to the user.
 */
function startIncrementalProcessing(): void {
  if (incrementalProcessTimer) {
    clearInterval(incrementalProcessTimer);
  }

  incrementalProcessTimer = setInterval(async () => {
    if (!isActive || !eventCallback || !abortController) {
      if (incrementalProcessTimer) {
        clearInterval(incrementalProcessTimer);
        incrementalProcessTimer = null;
      }
      return;
    }

    // Skip if already processing or not enough chunks
    if (isProcessing || audioChunks.length < MIN_CHUNK_SIZE_FOR_PARTIAL) {
      return;
    }

    // Only process if we have new chunks since last time
    if (audioChunks.length <= processedChunkCount) {
      return;
    }

    // Mark as processing to prevent concurrent calls
    // Capture chunk count atomically to avoid race conditions
    isProcessing = true;
    const startIndex = processedChunkCount;
    const currentChunkCount = audioChunks.length;
    processedChunkCount = currentChunkCount;

    console.log('[recordingAsr] Starting incremental processing:', 
      currentChunkCount, 'chunks,', 
      currentChunkCount - startIndex, 'new');

    // Process chunks asynchronously
    await processChunks(
      abortController.signal,
      eventCallback,
      audioChunks,
      startIndex
    );

    isProcessing = false;
  }, INCREMENTAL_PROCESS_INTERVAL_MS);
}

/**
 * Recording ASR Engine instance
 * 
 * Implements the AsrEngine interface for real microphone capture.
 * Uses a pluggable transcriber (stub by default, can be swapped via setTranscriber).
 * 
 * Usage:
 * ```typescript
 * import { recordingAsrEngine, setTranscriber } from './recordingAsr';
 * import { whisperTranscriber } from './transcription/whisperTranscriber';
 * 
 * // Optionally set a different transcriber
 * setTranscriber(whisperTranscriber);
 * 
 * await recordingAsrEngine.start((event) => {
 *   console.log('ASR event:', event);
 * });
 * 
 * // Later...
 * recordingAsrEngine.stop();
 * ```
 */
export const recordingAsrEngine: AsrEngine = {
  start,
  stop,
};

// Also export individual functions for testing
export { start, stop };
