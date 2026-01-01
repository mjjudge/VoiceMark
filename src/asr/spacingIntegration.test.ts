/**
 * Integration tests for spacing normalization in auto-apply flow.
 */

import { describe, it, expect } from 'vitest';
import { normalizeSpacing } from './textBuffer';
import { extractVoiceMarkCommand } from '../voice/extractVoiceMarkCommand';
import { voiceCommandToEditorOp } from '../voice/voiceCommandToEditorOp';

describe('Spacing normalization integration', () => {
  const prefixes = ['voicemark', 'voice mark'];

  describe('auto-apply workflow simulation', () => {
    it('should add space between consecutive words', () => {
      let lastApplied = '';
      
      // First segment: "Hello"
      const text1 = 'Hello';
      const spacing1 = normalizeSpacing(lastApplied, text1);
      const insert1 = spacing1 + text1;
      lastApplied = insert1;
      
      expect(insert1).toBe('Hello');
      
      // Second segment: "world"
      const text2 = 'world';
      const spacing2 = normalizeSpacing(lastApplied, text2);
      const insert2 = spacing2 + text2;
      lastApplied = insert2;
      
      expect(insert2).toBe(' world');
    });

    it('should not add space before punctuation command', () => {
      let lastApplied = 'Hello';
      
      // Command: "voicemark comma"
      const extracted = extractVoiceMarkCommand('voicemark comma', prefixes);
      expect(extracted.before).toBe('');
      expect(extracted.command).toBe('voicemark comma');
      
      // Parse the command
      const result = voiceCommandToEditorOp(extracted.command);
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0].type === 'insertText') {
        const punctuation = result.ops[0].text;
        expect(punctuation).toBe(',');
        
        // Check spacing before punctuation
        const spacing = normalizeSpacing(lastApplied, punctuation);
        expect(spacing).toBe('');
        
        lastApplied = punctuation;
      }
    });

    it('should add space after punctuation for next word', () => {
      const lastApplied = ',';
      
      const text = 'world';
      const spacing = normalizeSpacing(lastApplied, text);
      expect(spacing).toBe(' ');
    });

    it('should handle text before command properly', () => {
      let lastApplied = 'Hello';
      
      // Segment: "world voicemark comma"
      const extracted = extractVoiceMarkCommand('world voicemark comma', prefixes);
      expect(extracted.before).toBe('world');
      expect(extracted.command).toBe('voicemark comma');
      
      // Apply the before text with spacing
      const spacing = normalizeSpacing(lastApplied, extracted.before);
      expect(spacing).toBe(' ');
      const insert = spacing + extracted.before;
      expect(insert).toBe(' world');
      lastApplied = insert;
      
      // Apply the punctuation command
      const result = voiceCommandToEditorOp(extracted.command);
      if (result.kind === 'ops' && result.ops[0].type === 'insertText') {
        const punctuation = result.ops[0].text;
        const punctSpacing = normalizeSpacing(lastApplied, punctuation);
        expect(punctSpacing).toBe('');
        lastApplied = punctuation;
      }
    });

    it('should not add space after newline', () => {
      const lastApplied = 'Hello\n';
      
      const text = 'World';
      const spacing = normalizeSpacing(lastApplied, text);
      expect(spacing).toBe('');
      
      const insert = spacing + text;
      expect(insert).toBe('World');
    });

    it('should handle sentence ending properly', () => {
      let lastApplied = 'Hello';
      
      // Add period
      const period = '.';
      const spacing1 = normalizeSpacing(lastApplied, period);
      expect(spacing1).toBe('');
      lastApplied = period;
      
      // Add next sentence
      const text = 'World';
      const spacing2 = normalizeSpacing(lastApplied, text);
      expect(spacing2).toBe(' ');
      
      const insert = spacing2 + text;
      expect(insert).toBe(' World');
    });
  });

  describe('edge cases', () => {
    it('should handle empty lastApplied', () => {
      const lastApplied = '';
      const text = 'Hello';
      const spacing = normalizeSpacing(lastApplied, text);
      expect(spacing).toBe('');
    });

    it('should handle multiple punctuation marks', () => {
      let lastApplied = 'Hello';
      
      // Add exclamation
      const excl = '!';
      const spacing1 = normalizeSpacing(lastApplied, excl);
      expect(spacing1).toBe('');
      lastApplied = excl;
      
      // Add question mark (unusual but should work)
      const ques = '?';
      const spacing2 = normalizeSpacing(lastApplied, ques);
      expect(spacing2).toBe('');
    });
  });
});
