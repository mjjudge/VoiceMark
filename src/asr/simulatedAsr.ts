/**
 * Simulated ASR Engine
 * 
 * This is a frontend-only simulation for development and testing.
 * It emits ASR events periodically to simulate real speech recognition behavior.
 * 
 * Future: Replace with real Whisper.cpp integration
 */

import type { AsrEvent } from './events';

// Sample phrases for simulation
const SAMPLE_PHRASES = [
  'The quick brown fox jumps over the lazy dog',
  'VoiceMark is a powerful dictation tool',
  'Testing voice recognition capabilities',
  'Make this text bold and underlined',
  'Insert new paragraph here',
  'Delete the last sentence please',
];

// Simulation parameters
const PARTIAL_INTERVAL_MS = 250; // Emit partial updates every 250ms
const FINAL_INTERVAL_MIN_MS = 2000; // Finalize after 2-4 seconds
const FINAL_INTERVAL_MAX_MS = 4000;

let isActive = false;
let partialTimer: ReturnType<typeof setInterval> | null = null;
let segmentTimer: ReturnType<typeof setTimeout> | null = null;
let currentPhrase = '';
let currentWordIndex = 0;
let eventCallback: ((e: AsrEvent) => void) | null = null;

/**
 * Start the simulated ASR engine
 */
export function start(onEvent: (e: AsrEvent) => void): void {
  // Clean up any existing timers
  stop();

  eventCallback = onEvent;
  isActive = true;

  // Emit recording status
  onEvent({
    type: 'asr:status',
    state: 'recording',
    message: 'Simulated recording started',
  });

  // Start the continuous simulation loop
  scheduleNextSegment();
}

/**
 * Stop the simulated ASR engine
 */
export function stop(): void {
  isActive = false;

  // Clear all timers
  if (partialTimer) {
    clearInterval(partialTimer);
    partialTimer = null;
  }
  if (segmentTimer) {
    clearTimeout(segmentTimer);
    segmentTimer = null;
  }

  // Finalize any remaining text
  if (eventCallback && currentWordIndex > 0) {
    finalizeCurrent();
  }

  // Emit idle status
  if (eventCallback) {
    eventCallback({
      type: 'asr:status',
      state: 'idle',
      message: 'Recording stopped',
    });
  }

  eventCallback = null;
  currentPhrase = '';
  currentWordIndex = 0;
}

/**
 * Schedule the next segment to be generated
 */
function scheduleNextSegment(): void {
  if (!isActive) return;

  // Pick a random phrase
  currentPhrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];
  currentWordIndex = 0;

  // Start emitting partial results
  startPartialEmission();

  // Schedule finalization
  const finalDelay = FINAL_INTERVAL_MIN_MS + 
    Math.random() * (FINAL_INTERVAL_MAX_MS - FINAL_INTERVAL_MIN_MS);
  
  segmentTimer = setTimeout(() => {
    if (!isActive || !eventCallback) return;
    finalizeCurrent();
    // Schedule the next segment if still active
    if (isActive) {
      scheduleNextSegment();
    }
  }, finalDelay);
}

/**
 * Start emitting partial results progressively
 */
function startPartialEmission(): void {
  if (partialTimer) {
    clearInterval(partialTimer);
  }

  const words = currentPhrase.split(' ');

  partialTimer = setInterval(() => {
    if (!eventCallback || !isActive || currentWordIndex >= words.length) {
      if (partialTimer) {
        clearInterval(partialTimer);
        partialTimer = null;
      }
      return;
    }

    // Advance by one word at a time
    currentWordIndex++;
    const partialText = words.slice(0, currentWordIndex).join(' ');

    eventCallback({
      type: 'asr:partial',
      text: partialText,
      ts: Date.now(),
    });
  }, PARTIAL_INTERVAL_MS);
}

/**
 * Finalize the current partial text
 */
function finalizeCurrent(): void {
  if (!eventCallback || !isActive) return;

  // Stop partial emission
  if (partialTimer) {
    clearInterval(partialTimer);
    partialTimer = null;
  }

  // Emit final event with complete text
  if (currentPhrase) {
    eventCallback({
      type: 'asr:final',
      text: currentPhrase,
      ts: Date.now(),
    });
  }

  // Reset state for next segment
  currentWordIndex = 0;
}
