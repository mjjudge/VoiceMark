/**
 * ASR Event Types for streaming speech recognition results
 * 
 * These events form the contract between the ASR engine (simulated or real)
 * and the UI components that display transcription state.
 */

/**
 * Status event: Indicates ASR system state changes
 */
export interface AsrStatusEvent {
  type: 'asr:status';
  state: 'idle' | 'recording' | 'processing';
  message?: string;
}

/**
 * Partial event: Streaming intermediate transcription results
 */
export interface AsrPartialEvent {
  type: 'asr:partial';
  text: string;
  ts: number;
}

/**
 * Final event: Completed transcription segment
 */
export interface AsrFinalEvent {
  type: 'asr:final';
  text: string;
  ts: number;
}

/**
 * Error event: ASR processing errors
 */
export interface AsrErrorEvent {
  type: 'asr:error';
  message: string;
}

/**
 * Union type for all ASR events
 */
export type AsrEvent = AsrStatusEvent | AsrPartialEvent | AsrFinalEvent | AsrErrorEvent;

/**
 * ASR Event callback type
 */
export type AsrEventCallback = (event: AsrEvent) => void;

/**
 * ASR Start Options
 */
export interface AsrStartOptions {
  /** Specific audio input device ID (from enumerateDevices) */
  deviceId?: string;
}

/**
 * ASR Engine Interface
 * 
 * This interface defines the contract for any ASR engine implementation.
 * Both simulated and real ASR engines must conform to this interface,
 * allowing them to be used interchangeably in the application.
 * 
 * Implementations:
 * - simulatedAsr.ts: Emits fake transcription for development/testing
 * - recordingAsr.ts: Real microphone capture (transcription added later)
 * 
 * Future implementations will add:
 * - whisperAsr.ts: Real-time Whisper.cpp transcription
 */
export interface AsrEngine {
  /**
   * Start the ASR engine.
   * 
   * @param onEvent - Callback to receive ASR events
   * @param options - Optional configuration (e.g., deviceId for mic selection)
   * @returns void or Promise<void> (for async initialization like mic access)
   * 
   * The engine should:
   * 1. Emit asr:status with state 'recording' when ready
   * 2. Emit asr:partial events as transcription progresses
   * 3. Emit asr:final events when segments are complete
   * 4. Emit asr:error if something goes wrong
   */
  start(onEvent: AsrEventCallback, options?: AsrStartOptions): Promise<void> | void;

  /**
   * Stop the ASR engine.
   * 
   * The engine must:
   * 1. Stop all recording/processing immediately
   * 2. Clean up all resources (timers, streams, etc.)
   * 3. Emit asr:status with state 'idle'
   * 4. NOT emit any events after stop() returns
   * 
   * This must be idempotent - calling stop() multiple times should be safe.
   */
  stop(): void;
}
