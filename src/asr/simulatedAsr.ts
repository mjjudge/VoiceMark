/**
 * Simulated ASR Engine
 * 
 * This is a frontend-only simulation for development and testing.
 * It emits ASR events periodically to simulate real speech recognition behavior.
 * 
 * Future: Replace with real Whisper.cpp integration
 */

import type { AsrEvent } from './events';

/**
 * Sample phrases for simulation.
 * These use actual VoiceMark commands from VOICE_COMMANDS.md:
 * 
 * Punctuation: voicemark comma, voicemark full stop, voicemark question mark,
 *              voicemark exclamation mark, voicemark colon, voicemark semicolon, voicemark dash
 * Layout: voicemark new line, voicemark new paragraph
 * Editing: voicemark delete last word, voicemark delete last sentence
 * Formatting: voicemark make bold, voicemark make italic, voicemark make underline,
 *             voicemark toggle bold, voicemark unmake bold
 */
const SAMPLE_PHRASES = [
  // Simple sentences with proper punctuation
  'The quick brown fox jumps over the lazy dog voicemark full stop',
  'VoiceMark is a powerful dictation tool voicemark full stop',
  'Hello voicemark comma how are you today voicemark question mark',
  'This is amazing voicemark exclamation mark',
  
  // Multiple sentences
  'Testing voice recognition voicemark full stop It seems to work well voicemark full stop',
  'First sentence here voicemark full stop Second sentence follows voicemark full stop',
  
  // With paragraph breaks
  'End of first paragraph voicemark full stop voicemark new paragraph Starting a new thought voicemark full stop',
  'Introduction complete voicemark full stop voicemark new paragraph Now for the main content voicemark full stop',
  
  // With formatting commands
  'This word is voicemark make bold important voicemark full stop',
  'Please voicemark make italic emphasise voicemark full stop this point voicemark full stop',
  
  // With punctuation variety
  'Here is a list voicemark colon apples voicemark comma oranges voicemark comma and bananas voicemark full stop',
  'Wait voicemark dash I have an idea voicemark exclamation mark',
  'The answer is voicemark colon forty two voicemark full stop',
  
  // Delete commands (for testing confirmation flow)
  'This was a mistake voicemark delete last word voicemark full stop',
  
  // Questions
  'What do you think about this voicemark question mark',
  'Can voice dictation really work this well voicemark question mark',
  
  // Complex mixed content
  'Dear colleague voicemark comma voicemark new paragraph Thank you for your message voicemark full stop I will respond shortly voicemark full stop',
  'Note to self voicemark colon remember to review the document voicemark full stop',
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
  // Clear all timers first
  if (partialTimer) {
    clearInterval(partialTimer);
    partialTimer = null;
  }
  if (segmentTimer) {
    clearTimeout(segmentTimer);
    segmentTimer = null;
  }

  // Finalize any remaining text BEFORE setting isActive to false
  if (eventCallback && currentWordIndex > 0) {
    finalizeCurrent(true);
  }

  // Now set isActive to false to prevent further events
  isActive = false;

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
    if (!isActive || !eventCallback) {
      segmentTimer = null;
      return;
    }
    finalizeCurrent();
    segmentTimer = null;
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
    if (!isActive || !eventCallback || currentWordIndex >= words.length) {
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
 * @param force If true, finalize even when !isActive (used during stop())
 */
function finalizeCurrent(force = false): void {
  if (!eventCallback || (!isActive && !force)) return;

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
