/**
 * Integration tests for recordingAsr incremental processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as recordingAsr from './recordingAsr';
import type { AsrEvent } from './events';
import type { Transcriber } from './transcription/types';

// Mock transcriber for testing
const createMockTranscriber = (transcribeDelay = 100): Transcriber => ({
  async transcribe(blob: Blob, opts?: { signal?: AbortSignal }): Promise<string> {
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, transcribeDelay));
    
    // Check for abort
    if (opts?.signal?.aborted) {
      throw new DOMException('Transcription aborted', 'AbortError');
    }
    
    // Return mock text based on blob size
    const sizeKb = Math.round(blob.size / 1024);
    return `Transcribed ${sizeKb}KB of audio`;
  },
});

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  
  constructor(
    public stream: MediaStream,
    public options?: { mimeType?: string }
  ) {}
  
  start(timeslice?: number): void {
    this.state = 'recording';
    
    // Simulate ondataavailable at intervals
    if (timeslice) {
      this.intervalId = setInterval(() => {
        if (this.ondataavailable && this.state === 'recording') {
          // Create a mock blob with some data
          const mockData = new Uint8Array(1024 * 10); // 10KB of mock audio data
          const blob = new Blob([mockData], { type: this.options?.mimeType || 'audio/webm' });
          this.ondataavailable({ data: blob } as BlobEvent);
        }
      }, timeslice);
    }
  }
  
  stop(): void {
    this.state = 'inactive';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Emit final data chunk
    if (this.ondataavailable) {
      const mockData = new Uint8Array(1024 * 5); // 5KB final chunk
      const blob = new Blob([mockData], { type: this.options?.mimeType || 'audio/webm' });
      this.ondataavailable({ data: blob } as BlobEvent);
    }
    
    // Fire onstop after a short delay (simulate async behavior)
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 10);
  }
  
  static isTypeSupported(mimeType: string): boolean {
    return mimeType.includes('webm');
  }
}

describe('recordingAsr - incremental processing', () => {
  let events: AsrEvent[] = [];
  let mockStream: MediaStream;
  
  beforeEach(() => {
    events = [];
    
    // Mock navigator and getUserMedia
    if (!global.navigator) {
      (global as { navigator: Navigator }).navigator = {} as Navigator;
    }
    
    mockStream = {
      getTracks: () => [{
        stop: vi.fn(),
        label: 'Mock Microphone',
      }] as unknown as MediaStreamTrack[],
      getAudioTracks: () => [{
        label: 'Mock Microphone',
      }] as unknown as MediaStreamTrack[],
    } as MediaStream;
    
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    } as unknown as MediaDevices;
    
    // Mock MediaRecorder
    (global as unknown as { MediaRecorder: typeof MockMediaRecorder }).MediaRecorder = MockMediaRecorder;
    
    // Use fake timers for predictable testing
    vi.useFakeTimers();
    
    // Set up a fast transcriber
    recordingAsr.setTranscriber(createMockTranscriber(50));
  });
  
  afterEach(() => {
    recordingAsr.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  describe('incremental chunk processing', () => {
    it('should emit partial results during recording', async () => {
      // Start recording
      await recordingAsr.start((e) => events.push(e));
      
      // Clear initial status event
      events = [];
      
      // Simulate recording for 4 seconds (4 chunks)
      await vi.advanceTimersByTimeAsync(4000);
      
      // Wait for incremental processing interval (3 seconds)
      await vi.advanceTimersByTimeAsync(3000);
      
      // Should have emitted at least one partial event
      const partialEvents = events.filter(e => e.type === 'asr:partial');
      expect(partialEvents.length).toBeGreaterThan(0);
      
      if (partialEvents[0]?.type === 'asr:partial') {
        expect(partialEvents[0].text).toBeTruthy();
        expect(partialEvents[0].text).toContain('Transcribed');
      }
    });
    
    it('should process multiple incremental batches', async () => {
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // First batch - 3 seconds of recording + 3 seconds processing interval
      await vi.advanceTimersByTimeAsync(6000);
      const partialCount1 = events.filter(e => e.type === 'asr:partial').length;
      
      // Second batch - another 3 seconds of recording + processing
      await vi.advanceTimersByTimeAsync(6000);
      const partialCount2 = events.filter(e => e.type === 'asr:partial').length;
      
      // Should have more partials after second batch
      expect(partialCount2).toBeGreaterThan(partialCount1);
    });
    
    it('should process chunks when enough accumulate', async () => {
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // Record for enough time to trigger processing
      // The interval is 3 seconds, and we need at least 2 chunks (MIN_CHUNK_SIZE_FOR_PARTIAL)
      // After 4 seconds: 4 chunks accumulated, and one processing interval has passed
      await vi.advanceTimersByTimeAsync(4000);
      
      // Should have processed and emitted partial results
      const partialEvents = events.filter(e => e.type === 'asr:partial');
      expect(partialEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('graceful stop with data preservation', () => {
    it('should finalize and transcribe all chunks on stop', async () => {
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // Record for 3 seconds (3 chunks)
      await vi.advanceTimersByTimeAsync(3000);
      
      // Stop recording
      recordingAsr.stop();
      
      // Advance timers to allow finalization to complete
      await vi.advanceTimersByTimeAsync(1000);
      
      // Should have a final event
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents.length).toBe(1);
      
      if (finalEvents[0]?.type === 'asr:final') {
        expect(finalEvents[0].text).toBeTruthy();
        expect(finalEvents[0].text).toContain('Transcribed');
      }
    });
    
    it('should process remaining chunks even after abrupt stop', async () => {
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // Record for 2 seconds
      await vi.advanceTimersByTimeAsync(2000);
      
      // Abrupt stop without waiting for incremental processing
      recordingAsr.stop();
      
      // Wait for finalization
      await vi.advanceTimersByTimeAsync(500);
      
      // Should still get final transcription with all accumulated data
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should not lose data when stopped during incremental processing', async () => {
      const slowTranscriber: Transcriber = {
        async transcribe(blob: Blob): Promise<string> {
          // Simulate slow transcription
          await new Promise(resolve => setTimeout(resolve, 2000));
          return `Processed ${blob.size} bytes`;
        },
      };
      
      recordingAsr.setTranscriber(slowTranscriber);
      
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // Record enough to trigger incremental processing
      await vi.advanceTimersByTimeAsync(4000);
      
      // Trigger incremental processing
      await vi.advanceTimersByTimeAsync(3000);
      
      // Stop while processing is happening
      recordingAsr.stop();
      
      // Wait for both incremental and final processing to complete
      await vi.advanceTimersByTimeAsync(3000);
      
      // Should have received final event with all data
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('abort handling', () => {
    it('should cancel transcription when aborted', async () => {
      await recordingAsr.start((e) => events.push(e));
      events = [];
      
      // Record for a bit
      await vi.advanceTimersByTimeAsync(2000);
      
      // Abort transcription
      recordingAsr.abort();
      
      // Wait for any pending operations
      await vi.advanceTimersByTimeAsync(1000);
      
      // Should not have final event
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents.length).toBe(0);
      
      // Should have idle status
      const idleEvents = events.filter(
        e => e.type === 'asr:status' && e.state === 'idle'
      );
      expect(idleEvents.length).toBeGreaterThan(0);
    });
  });
  
  describe('concurrent safety', () => {
    it('should not process concurrently', async () => {
      let concurrentCalls = 0;
      let maxConcurrent = 0;
      
      const trackingTranscriber: Transcriber = {
        async transcribe(_blob: Blob): Promise<string> {
          concurrentCalls++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
          await new Promise(resolve => setTimeout(resolve, 100));
          concurrentCalls--;
          return 'test';
        },
      };
      
      recordingAsr.setTranscriber(trackingTranscriber);
      
      await recordingAsr.start((e) => events.push(e));
      
      // Trigger multiple processing intervals
      await vi.advanceTimersByTimeAsync(10000);
      
      // Should never have more than 1 concurrent call
      expect(maxConcurrent).toBeLessThanOrEqual(1);
    });
  });
});
