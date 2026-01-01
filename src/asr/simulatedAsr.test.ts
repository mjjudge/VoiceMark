/**
 * Tests for simulatedAsr timer management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as simulatedAsr from './simulatedAsr';
import type { AsrEvent } from './events';

describe('simulatedAsr', () => {
  let events: AsrEvent[] = [];
  
  beforeEach(() => {
    events = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    simulatedAsr.stop();
    vi.restoreAllMocks();
  });

  describe('timer management', () => {
    it('should emit status event when started', () => {
      simulatedAsr.start((e) => events.push(e));
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'asr:status',
        state: 'recording',
      });
    });

    it('should stop emitting events after stop is called', () => {
      simulatedAsr.start((e) => events.push(e));
      events = []; // Clear initial status event
      
      // Advance timers to trigger partial emissions
      vi.advanceTimersByTime(500);
      const eventsBeforeStop = events.length;
      expect(eventsBeforeStop).toBeGreaterThan(0);
      
      // Stop - will emit idle status
      simulatedAsr.stop();
      const idleStatusCount = events.filter(e => e.type === 'asr:status' && e.state === 'idle').length;
      expect(idleStatusCount).toBe(1);
      
      events = []; // Clear all events including idle status
      
      // Advance timers further - should not emit any new events
      vi.advanceTimersByTime(5000);
      expect(events).toHaveLength(0);
    });

    it('should emit partial events progressively', () => {
      simulatedAsr.start((e) => events.push(e));
      events = []; // Clear initial status event
      
      // Advance by partial interval
      vi.advanceTimersByTime(250);
      expect(events.some(e => e.type === 'asr:partial')).toBe(true);
      
      const partialEvent = events.find(e => e.type === 'asr:partial');
      expect(partialEvent).toBeDefined();
      if (partialEvent?.type === 'asr:partial') {
        expect(partialEvent.text).toBeTruthy();
      }
    });

    it('should emit final event after delay', () => {
      simulatedAsr.start((e) => events.push(e));
      events = []; // Clear initial status event
      
      // Advance to finalization time
      vi.advanceTimersByTime(4000);
      
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents.length).toBeGreaterThan(0);
      
      if (finalEvents[0]?.type === 'asr:final') {
        expect(finalEvents[0].text).toBeTruthy();
      }
    });

    it('should not emit final events after stop', () => {
      simulatedAsr.start((e) => events.push(e));
      
      // Stop immediately
      simulatedAsr.stop();
      events = []; // Clear stop status event
      
      // Advance timers past finalization time
      vi.advanceTimersByTime(5000);
      
      // Should not have any final events
      const finalEvents = events.filter(e => e.type === 'asr:final');
      expect(finalEvents).toHaveLength(0);
    });

    it('should clear all timers on stop', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      simulatedAsr.start((e) => events.push(e));
      
      // Advance to start some timers
      vi.advanceTimersByTime(500);
      
      simulatedAsr.stop();
      
      // Verify timers were cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('event callback guards', () => {
    it('should not call callback after stop in finalization', () => {
      let callbackCount = 0;
      simulatedAsr.start(() => callbackCount++);
      
      callbackCount = 0; // Reset after initial status
      simulatedAsr.stop();
      callbackCount = 0; // Reset after stop status
      
      // Try to trigger finalization
      vi.advanceTimersByTime(5000);
      
      // Should not have called callback for final event
      expect(callbackCount).toBe(0);
    });

    it('should handle multiple start/stop cycles', () => {
      // First cycle
      simulatedAsr.start((e) => events.push(e));
      vi.advanceTimersByTime(1000);
      simulatedAsr.stop();
      
      const eventsAfterFirstCycle = events.length;
      
      // Second cycle
      simulatedAsr.start((e) => events.push(e));
      vi.advanceTimersByTime(1000);
      simulatedAsr.stop();
      
      // Should have more events from second cycle
      expect(events.length).toBeGreaterThan(eventsAfterFirstCycle);
    });
  });
});
