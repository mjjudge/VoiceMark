/**
 * Tests for extractVoiceMarkCommand helper function.
 */

import { describe, it, expect } from 'vitest';
import { extractVoiceMarkCommand } from './extractVoiceMarkCommand';

describe('extractVoiceMarkCommand', () => {
  describe('command detection', () => {
    it('should extract command from "Hello VoiceMark comma"', () => {
      const result = extractVoiceMarkCommand('Hello VoiceMark comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('VoiceMark comma');
      expect(result.after).toBe('');
    });

    it('should extract command from "Hello voice mark new paragraph"', () => {
      const result = extractVoiceMarkCommand('Hello voice mark new paragraph', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('voice mark new paragraph');
      expect(result.after).toBe('');
    });

    it('should return entire text as before when no prefix found', () => {
      const result = extractVoiceMarkCommand('No prefix here', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('No prefix here');
      expect(result.command).toBe(null);
      expect(result.after).toBe('');
    });

    it('should handle command at the start of text', () => {
      const result = extractVoiceMarkCommand('voicemark comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });

    it('should handle command at the end of text', () => {
      const result = extractVoiceMarkCommand('Some text voicemark comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Some text');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });
  });

  describe('case insensitivity', () => {
    it('should match VoiceMark with different casing', () => {
      const result = extractVoiceMarkCommand('Hello VOICEMARK comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('VOICEMARK comma');
      expect(result.after).toBe('');
    });

    it('should match voice mark with different casing', () => {
      const result = extractVoiceMarkCommand('Test Voice Mark full stop', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Test');
      expect(result.command).toBe('Voice Mark full stop');
      expect(result.after).toBe('');
    });

    it('should match mixed case prefix', () => {
      const result = extractVoiceMarkCommand('Hello VoIcEmArK comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('VoIcEmArK comma');
      expect(result.after).toBe('');
    });
  });

  describe('whole-word matching', () => {
    it('should not match prefix as substring in middle of word', () => {
      const result = extractVoiceMarkCommand('The invoicemark is here', ['voicemark']);
      
      expect(result.before).toBe('The invoicemark is here');
      expect(result.command).toBe(null);
      expect(result.after).toBe('');
    });

    it('should not match prefix as part of compound word', () => {
      const result = extractVoiceMarkCommand('This is voicemarkable', ['voicemark']);
      
      expect(result.before).toBe('This is voicemarkable');
      expect(result.command).toBe(null);
      expect(result.after).toBe('');
    });

    it('should match prefix at word boundary', () => {
      const result = extractVoiceMarkCommand('Say voicemark comma', ['voicemark']);
      
      expect(result.before).toBe('Say');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });
  });

  describe('whitespace handling', () => {
    it('should trim trailing space from before segment', () => {
      const result = extractVoiceMarkCommand('Hello  voicemark comma', ['voicemark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });

    it('should preserve command text exactly', () => {
      const result = extractVoiceMarkCommand('Test voicemark  comma', ['voicemark']);
      
      expect(result.before).toBe('Test');
      expect(result.command).toBe('voicemark  comma');
      expect(result.after).toBe('');
    });

    it('should handle multiple spaces before prefix', () => {
      const result = extractVoiceMarkCommand('Hello    voicemark comma', ['voicemark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });
  });

  describe('prefix variations', () => {
    it('should match first prefix in array', () => {
      const result = extractVoiceMarkCommand('Test voicemark comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Test');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });

    it('should match second prefix in array', () => {
      const result = extractVoiceMarkCommand('Test voice mark comma', ['voicemark', 'voice mark']);
      
      expect(result.before).toBe('Test');
      expect(result.command).toBe('voice mark comma');
      expect(result.after).toBe('');
    });

    it('should work with custom prefixes', () => {
      const result = extractVoiceMarkCommand('Hello custom prefix comma', ['custom prefix']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('custom prefix comma');
      expect(result.after).toBe('');
    });

    it('should work with single-word prefix', () => {
      const result = extractVoiceMarkCommand('Hello voicemark comma', ['voicemark']);
      
      expect(result.before).toBe('Hello');
      expect(result.command).toBe('voicemark comma');
      expect(result.after).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = extractVoiceMarkCommand('', ['voicemark']);
      
      expect(result.before).toBe('');
      expect(result.command).toBe(null);
      expect(result.after).toBe('');
    });

    it('should handle prefix alone', () => {
      const result = extractVoiceMarkCommand('voicemark', ['voicemark']);
      
      expect(result.before).toBe('');
      expect(result.command).toBe('voicemark');
      expect(result.after).toBe('');
    });

    it('should handle prefix with trailing space only', () => {
      const result = extractVoiceMarkCommand('voicemark ', ['voicemark']);
      
      expect(result.before).toBe('');
      expect(result.command).toBe('voicemark ');
      expect(result.after).toBe('');
    });

    it('should handle text with only spaces', () => {
      const result = extractVoiceMarkCommand('   ', ['voicemark']);
      
      expect(result.before).toBe('   ');
      expect(result.command).toBe(null);
      expect(result.after).toBe('');
    });

    it('should handle multiple occurrences (match first)', () => {
      const result = extractVoiceMarkCommand('First voicemark comma then voicemark period', ['voicemark']);
      
      expect(result.before).toBe('First');
      expect(result.command).toBe('voicemark comma then voicemark period');
      expect(result.after).toBe('');
    });
  });


});
