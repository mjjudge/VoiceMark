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
