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

let activeTimer: number | null = null;
let partialTimer: number | null = null;
let currentPhrase = '';
let currentPosition = 0;
let eventCallback: ((e: AsrEvent) => void) | null = null;

/**
 * Start the simulated ASR engine
 */
export function start(onEvent: (e: AsrEvent) => void): void {
  // Clean up any existing timers
  stop();

  eventCallback = onEvent;

  // Emit recording status
  onEvent({
    type: 'asr:status',
    state: 'recording',
    message: 'Simulated recording started',
  });

  // Pick a random phrase
  currentPhrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];
  currentPosition = 0;

  // Start emitting partial results
  startPartialEmission();

  // Schedule finalization
  const finalDelay = FINAL_INTERVAL_MIN_MS + 
    Math.random() * (FINAL_INTERVAL_MAX_MS - FINAL_INTERVAL_MIN_MS);
  
  activeTimer = setTimeout(() => {
    finalizeCurrent();
    // Reset for next segment
    currentPhrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];
    currentPosition = 0;
    startPartialEmission();
    
    // Schedule another finalization
    const nextFinalDelay = FINAL_INTERVAL_MIN_MS + 
      Math.random() * (FINAL_INTERVAL_MAX_MS - FINAL_INTERVAL_MIN_MS);
    activeTimer = setTimeout(() => finalizeCurrent(), nextFinalDelay);
  }, finalDelay);
}

/**
 * Stop the simulated ASR engine
 */
export function stop(): void {
  // Clear all timers
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (partialTimer) {
    clearInterval(partialTimer);
    partialTimer = null;
  }

  // Finalize any remaining text
  if (eventCallback && currentPosition > 0) {
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
  currentPosition = 0;
}

/**
 * Start emitting partial results progressively
 */
function startPartialEmission(): void {
  if (partialTimer) {
    clearInterval(partialTimer);
  }

  partialTimer = setInterval(() => {
    if (!eventCallback || currentPosition >= currentPhrase.length) {
      return;
    }

    // Advance position by a few words
    const words = currentPhrase.split(' ');
    const wordsSoFar = Math.min(
      Math.floor((currentPosition / currentPhrase.length) * words.length) + 1,
      words.length
    );
    const partialText = words.slice(0, wordsSoFar).join(' ');
    currentPosition = partialText.length;

    eventCallback({
      type: 'asr:partial',
      text: partialText,
      ts: Date.now(),
    });

    // Stop emitting partials once we've shown the full phrase
    if (currentPosition >= currentPhrase.length) {
      if (partialTimer) {
        clearInterval(partialTimer);
        partialTimer = null;
      }
    }
  }, PARTIAL_INTERVAL_MS);
}

/**
 * Finalize the current partial text
 */
function finalizeCurrent(): void {
  if (!eventCallback) return;

  // Stop partial emission
  if (partialTimer) {
    clearInterval(partialTimer);
    partialTimer = null;
  }

  // Emit final event with complete text
  const finalText = currentPhrase;
  if (finalText) {
    eventCallback({
      type: 'asr:final',
      text: finalText,
      ts: Date.now(),
    });
  }

  // Reset state
  currentPosition = 0;
}
