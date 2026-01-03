/**
 * Transcriber initialization
 * 
 * Selects the appropriate transcriber based on environment and ASR mode.
 * 
 * - In 'real' ASR mode with sidecar available: use whisperTranscriber
 * - In 'simulated' mode or sidecar unavailable: use stubTranscriber
 */

import { stubTranscriber } from './stubTranscriber';
import { whisperTranscriber, checkSidecarHealth } from './whisperTranscriber';
import { setTranscriber } from '../recordingAsr';
import type { Transcriber } from './types';

/** Whether the sidecar is available */
let sidecarAvailable = false;

/** Currently active transcriber */
let activeTranscriber: Transcriber = stubTranscriber;

/**
 * Initialize the transcriber subsystem.
 * 
 * Checks sidecar health and configures the appropriate transcriber.
 * Should be called once at app startup.
 * 
 * @returns Promise resolving to true if whisper transcriber is active
 */
export async function initTranscriber(): Promise<boolean> {
  const asrMode = import.meta.env.VITE_ASR_MODE ?? 'real';
  
  // In simulated mode, always use stub
  if (asrMode === 'simulated') {
    console.log('[transcriber] Simulated mode - using stubTranscriber');
    activeTranscriber = stubTranscriber;
    setTranscriber(stubTranscriber);
    return false;
  }

  // Try to connect to sidecar
  try {
    console.log('[transcriber] Checking sidecar health...');
    const health = await checkSidecarHealth();
    
    if (health.ok && health.model_loaded) {
      console.log('[transcriber] Sidecar ready - using whisperTranscriber');
      sidecarAvailable = true;
      activeTranscriber = whisperTranscriber;
      setTranscriber(whisperTranscriber);
      return true;
    } else if (health.ok) {
      console.warn('[transcriber] Sidecar running but model not loaded - using stubTranscriber');
      sidecarAvailable = false;
      activeTranscriber = stubTranscriber;
      setTranscriber(stubTranscriber);
      return false;
    }
  } catch (error) {
    console.warn('[transcriber] Sidecar not available:', error);
    console.log('[transcriber] Falling back to stubTranscriber');
  }

  sidecarAvailable = false;
  activeTranscriber = stubTranscriber;
  setTranscriber(stubTranscriber);
  return false;
}

/**
 * Check if the sidecar is currently available.
 */
export function isSidecarAvailable(): boolean {
  return sidecarAvailable;
}

/**
 * Get the currently active transcriber.
 */
export function getActiveTranscriber(): Transcriber {
  return activeTranscriber;
}

/**
 * Force use of whisper transcriber (for testing).
 */
export function useWhisperTranscriber(): void {
  activeTranscriber = whisperTranscriber;
  setTranscriber(whisperTranscriber);
}

/**
 * Force use of stub transcriber (for testing).
 */
export function useStubTranscriber(): void {
  activeTranscriber = stubTranscriber;
  setTranscriber(stubTranscriber);
}
