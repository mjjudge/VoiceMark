/**
 * Streaming ASR Engine
 * 
 * Real-time speech-to-text using WebSocket streaming to the Rust sidecar.
 * Audio is captured via AudioWorklet and sent as PCM chunks.
 * 
 * Key features:
 * - Low-latency audio capture via AudioWorklet
 * - WebSocket streaming to sidecar at /stream
 * - Partial results displayed while speaking
 * - Final results on stop
 * 
 * Audio flow:
 *   Microphone → AudioWorklet → PCM chunks → WebSocket → Sidecar → Whisper
 *                                                              ↓
 *   Editor ← asr:final ← asr:partial ←─────────────── partial/final
 */

import type { AsrEventCallback, AsrEngine, AsrStartOptions } from './events';

// Configuration
const SIDECAR_WS_URL = 'ws://localhost:3001/stream';
const TARGET_SAMPLE_RATE = 16000;

// Engine state
let isActive = false;
let eventCallback: AsrEventCallback | null = null;
let webSocket: WebSocket | null = null;
let audioContext: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;
let mediaStream: MediaStream | null = null;

/**
 * Server message types (matching Rust sidecar)
 */
interface ServerPartial {
  type: 'partial';
  text: string;
  ts: number;
}

interface ServerFinal {
  type: 'final';
  text: string;
  ts: number;
}

interface ServerError {
  type: 'error';
  message: string;
}

interface ServerReady {
  type: 'ready';
  message: string;
}

type ServerMessage = ServerPartial | ServerFinal | ServerError | ServerReady;

/**
 * Start the streaming ASR engine.
 * 
 * 1. Connects to WebSocket
 * 2. Initializes AudioWorklet for PCM capture
 * 3. Starts streaming audio to sidecar
 * 
 * @param onEvent - Callback to receive ASR events
 * @param options - Optional configuration (e.g., deviceId)
 */
async function start(onEvent: AsrEventCallback, options?: AsrStartOptions): Promise<void> {
  // Clean up any existing session
  stop();

  eventCallback = onEvent;
  isActive = true;

  try {
    // Step 1: Connect to WebSocket
    await connectWebSocket();

    // Step 2: Initialize audio capture
    await initializeAudioCapture(options?.deviceId);

    // Emit recording status
    eventCallback({
      type: 'asr:status',
      state: 'recording',
      message: 'Streaming transcription started',
    });

  } catch (error) {
    isActive = false;
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (eventCallback) {
      eventCallback({
        type: 'asr:error',
        message: `Streaming ASR failed: ${message}`,
      });
      eventCallback({
        type: 'asr:status',
        state: 'idle',
        message: 'Streaming failed to start',
      });
    }
    
    cleanup();
    throw error;
  }
}

/**
 * Connect to the sidecar WebSocket.
 */
function connectWebSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[streamingAsr] Connecting to WebSocket:', SIDECAR_WS_URL);
    
    webSocket = new WebSocket(SIDECAR_WS_URL);

    webSocket.onopen = () => {
      console.log('[streamingAsr] WebSocket connected');
      resolve();
    };

    webSocket.onerror = (event) => {
      console.error('[streamingAsr] WebSocket error:', event);
      reject(new Error('WebSocket connection failed'));
    };

    webSocket.onclose = (event) => {
      console.log('[streamingAsr] WebSocket closed:', event.code, event.reason);
      if (isActive) {
        // Unexpected close
        if (eventCallback) {
          eventCallback({
            type: 'asr:error',
            message: 'WebSocket connection closed unexpectedly',
          });
        }
      }
    };

    webSocket.onmessage = (event) => {
      handleServerMessage(event.data);
    };
  });
}

/**
 * Handle a message from the sidecar.
 */
function handleServerMessage(data: string): void {
  try {
    const msg = JSON.parse(data) as ServerMessage;

    switch (msg.type) {
      case 'partial':
        console.log('[streamingAsr] Partial:', msg.text);
        if (eventCallback && isActive) {
          eventCallback({
            type: 'asr:partial',
            text: msg.text,
            ts: msg.ts,
          });
        }
        break;

      case 'final':
        console.log('[streamingAsr] Final:', msg.text);
        if (eventCallback && isActive) {
          eventCallback({
            type: 'asr:final',
            text: msg.text,
            ts: msg.ts,
          });
        }
        break;

      case 'error':
        console.error('[streamingAsr] Server error:', msg.message);
        if (eventCallback) {
          eventCallback({
            type: 'asr:error',
            message: msg.message,
          });
        }
        break;

      case 'ready':
        console.log('[streamingAsr] Server ready:', msg.message);
        break;

      default:
        console.warn('[streamingAsr] Unknown message type:', msg);
    }
  } catch (error) {
    console.error('[streamingAsr] Failed to parse server message:', error);
  }
}

/**
 * Initialize AudioWorklet for PCM capture.
 */
async function initializeAudioCapture(deviceId?: string): Promise<void> {
  // Create AudioContext with 16kHz sample rate if possible
  // Note: Some browsers don't support custom sample rates
  audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  
  // Fallback: if browser forced a different rate, we'll resample in the worklet
  const actualSampleRate = audioContext.sampleRate;
  console.log('[streamingAsr] AudioContext sample rate:', actualSampleRate);

  // Load the AudioWorklet processor
  const workletUrl = new URL('./pcmAudioProcessor.worklet.ts', import.meta.url);
  await audioContext.audioWorklet.addModule(workletUrl.href);

  // Request microphone access
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: TARGET_SAMPLE_RATE,
  };
  
  if (deviceId) {
    audioConstraints.deviceId = { exact: deviceId };
    console.log('[streamingAsr] Using device:', deviceId);
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
  });

  // Log which device we got
  const audioTrack = mediaStream.getAudioTracks()[0];
  if (audioTrack) {
    console.log('[streamingAsr] Active microphone:', audioTrack.label);
  }

  // Create source node from microphone
  const sourceNode = audioContext.createMediaStreamSource(mediaStream);

  // Create the worklet node
  workletNode = new AudioWorkletNode(audioContext, 'pcm-audio-processor');

  // Initialize the worklet with sample rate
  workletNode.port.postMessage({
    type: 'init',
    sampleRate: actualSampleRate,
  });

  // Handle audio chunks from worklet
  workletNode.port.onmessage = (event) => {
    if (event.data.type === 'audioChunk') {
      sendAudioChunk(event.data.samples);
    }
  };

  // Connect: microphone → worklet
  sourceNode.connect(workletNode);

  // Don't connect to destination (no playback needed)
  console.log('[streamingAsr] Audio capture initialized');
}

/**
 * Send an audio chunk to the sidecar via WebSocket.
 */
function sendAudioChunk(buffer: ArrayBuffer): void {
  if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
    console.warn('[streamingAsr] WebSocket not ready, dropping chunk');
    return;
  }

  // Send as binary (raw PCM)
  webSocket.send(buffer);
}

/**
 * Stop the streaming ASR engine.
 * Sends an "end" message to finalize transcription.
 */
function stop(): void {
  console.log('[streamingAsr] Stopping...');
  
  const wasActive = isActive;
  isActive = false;

  // Send end message to get final transcription
  if (webSocket && webSocket.readyState === WebSocket.OPEN && wasActive) {
    webSocket.send(JSON.stringify({ type: 'end' }));
    
    // Emit processing status while waiting for final
    if (eventCallback) {
      eventCallback({
        type: 'asr:status',
        state: 'processing',
        message: 'Finalizing transcription...',
      });
    }
  }

  // Stop worklet
  if (workletNode) {
    workletNode.port.postMessage({ type: 'stop' });
  }

  // Give server a moment to respond, then cleanup
  setTimeout(() => {
    cleanup();
    
    if (eventCallback) {
      eventCallback({
        type: 'asr:status',
        state: 'idle',
        message: 'Streaming stopped',
      });
    }
    eventCallback = null;
  }, 500);
}

/**
 * Clean up all resources.
 */
function cleanup(): void {
  // Close WebSocket
  if (webSocket) {
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.close();
    }
    webSocket = null;
  }

  // Disconnect worklet
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }

  // Close AudioContext
  if (audioContext) {
    audioContext.close().catch(console.error);
    audioContext = null;
  }

  // Stop media stream
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

/**
 * Check if the streaming engine is currently active.
 */
export function isRecording(): boolean {
  return isActive;
}

/**
 * The streaming ASR engine instance.
 */
export const streamingAsrEngine: AsrEngine = {
  start,
  stop,
};

export default streamingAsrEngine;
