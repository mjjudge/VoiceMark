/**
 * PCM Audio Processor for Streaming Transcription
 * 
 * This AudioWorkletProcessor captures raw PCM audio from the microphone
 * and sends it to the main thread for streaming to the transcription server.
 * 
 * Audio format:
 * - Input: Float32 samples from Web Audio API (-1.0 to 1.0)
 * - Output: Int16 PCM samples for Whisper (matches expected input format)
 * 
 * The processor accumulates samples into chunks and posts them to the main
 * thread at regular intervals (configurable, default ~500ms of audio).
 */

// AudioWorklet globals (not available in main thread TypeScript)
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

// Chunk size in samples (16kHz * 0.5s = 8000 samples)
const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 500;
const CHUNK_SIZE = Math.floor((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS) / 1000);

class PcmAudioProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private bufferIndex: number;
  private inputSampleRate: number;
  private resampleRatio: number;
  private running: boolean;

  constructor() {
    super();
    
    // We'll resize based on actual input sample rate
    this.buffer = new Float32Array(CHUNK_SIZE);
    this.bufferIndex = 0;
    this.inputSampleRate = 48000; // Common default, will be updated
    this.resampleRatio = 1;
    this.running = true;

    // Handle messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this.inputSampleRate = event.data.sampleRate || 48000;
        this.resampleRatio = this.inputSampleRate / TARGET_SAMPLE_RATE;
        console.log(`[PcmAudioProcessor] Initialized: input=${this.inputSampleRate}Hz, ratio=${this.resampleRatio}`);
      } else if (event.data.type === 'stop') {
        this.running = false;
        // Flush remaining buffer
        if (this.bufferIndex > 0) {
          this.sendChunk();
        }
      }
    };
  }

  /**
   * Process audio input and accumulate into chunks.
   * Called by the Web Audio API with ~128 samples per call.
   */
  process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    if (!this.running) {
      return false; // Stop processing
    }

    const input = inputs[0];
    if (!input || input.length === 0) {
      return true; // No input, but keep running
    }

    // Use first channel (mono)
    const samples = input[0];
    if (!samples || samples.length === 0) {
      return true;
    }

    // Simple resampling: pick samples at the resample ratio
    // For better quality, a proper resampling algorithm should be used
    for (let i = 0; i < samples.length; i++) {
      // Skip samples based on resample ratio (downsample from input to 16kHz)
      const targetIndex = Math.floor(i / this.resampleRatio);
      
      // Only process if this is a sample we want
      if (i === Math.floor(targetIndex * this.resampleRatio)) {
        if (this.bufferIndex < this.buffer.length) {
          this.buffer[this.bufferIndex++] = samples[i];
        }
      }
    }

    // If buffer is full, send chunk
    if (this.bufferIndex >= CHUNK_SIZE) {
      this.sendChunk();
    }

    return true; // Keep running
  }

  /**
   * Send accumulated audio chunk to main thread.
   */
  private sendChunk(): void {
    // Convert Float32 to Int16
    const int16Samples = new Int16Array(this.bufferIndex);
    for (let i = 0; i < this.bufferIndex; i++) {
      // Clamp to [-1, 1] and scale to Int16 range
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));
      int16Samples[i] = Math.floor(sample * 32767);
    }

    // Post to main thread
    this.port.postMessage({
      type: 'audioChunk',
      samples: int16Samples.buffer,
      sampleRate: TARGET_SAMPLE_RATE,
      timestamp: Date.now(),
    }, [int16Samples.buffer]); // Transfer buffer ownership

    // Reset buffer
    this.buffer = new Float32Array(CHUNK_SIZE);
    this.bufferIndex = 0;
  }
}

registerProcessor('pcm-audio-processor', PcmAudioProcessor);
