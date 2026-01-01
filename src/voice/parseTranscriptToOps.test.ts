/**
 * Tests for parseTranscriptToOps.
 */

import { describe, it, expect } from 'vitest';
import { parseTranscriptToOps } from './parseTranscriptToOps';

describe('parseTranscriptToOps', () => {
  describe('basic text parsing', () => {
    it('should return empty array for empty string', () => {
      const result = parseTranscriptToOps('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      const result = parseTranscriptToOps('   \n  \t  ');
      expect(result).toEqual([]);
    });

    it('should parse plain text as insertText', () => {
      const result = parseTranscriptToOps('hello world');
      expect(result).toEqual([
        { type: 'insertText', text: 'hello world' }
      ]);
    });

    it('should parse multiple words as insertText', () => {
      const result = parseTranscriptToOps('this is a test');
      expect(result).toEqual([
        { type: 'insertText', text: 'this is a test' }
      ]);
    });
  });

  describe('sentence terminator splitting', () => {
    it('should split on period', () => {
      const result = parseTranscriptToOps('Hello world. Another sentence');
      expect(result).toEqual([
        { type: 'insertText', text: 'Hello world' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'Another sentence' }
      ]);
    });

    it('should split on question mark', () => {
      const result = parseTranscriptToOps('Are you there? Yes I am');
      expect(result).toEqual([
        { type: 'insertText', text: 'Are you there' },
        { type: 'insertText', text: '?' },
        { type: 'insertText', text: 'Yes I am' }
      ]);
    });

    it('should split on exclamation mark', () => {
      const result = parseTranscriptToOps('Amazing! Truly wonderful');
      expect(result).toEqual([
        { type: 'insertText', text: 'Amazing' },
        { type: 'insertText', text: '!' },
        { type: 'insertText', text: 'Truly wonderful' }
      ]);
    });

    it('should handle multiple terminators', () => {
      const result = parseTranscriptToOps('First. Second? Third!');
      expect(result).toEqual([
        { type: 'insertText', text: 'First' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'Second' },
        { type: 'insertText', text: '?' },
        { type: 'insertText', text: 'Third' },
        { type: 'insertText', text: '!' }
      ]);
    });

    it('should handle consecutive terminators', () => {
      const result = parseTranscriptToOps('What?! Really.');
      expect(result).toEqual([
        { type: 'insertText', text: 'What' },
        { type: 'insertText', text: '?' },
        { type: 'insertText', text: '!' },
        { type: 'insertText', text: 'Really' },
        { type: 'insertText', text: '.' }
      ]);
    });

    it('should handle text ending with terminator', () => {
      const result = parseTranscriptToOps('Hello world.');
      expect(result).toEqual([
        { type: 'insertText', text: 'Hello world' },
        { type: 'insertText', text: '.' }
      ]);
    });

    it('should handle text starting with terminator', () => {
      const result = parseTranscriptToOps('. Hello world');
      expect(result).toEqual([
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'Hello world' }
      ]);
    });
  });

  describe('newline handling', () => {
    it('should split on newlines', () => {
      const result = parseTranscriptToOps('First line\nSecond line');
      expect(result).toEqual([
        { type: 'insertText', text: 'First line' },
        { type: 'insertText', text: '\n' },
        { type: 'insertText', text: 'Second line' }
      ]);
    });

    it('should handle multiple newlines', () => {
      const result = parseTranscriptToOps('Line 1\nLine 2\nLine 3');
      expect(result).toEqual([
        { type: 'insertText', text: 'Line 1' },
        { type: 'insertText', text: '\n' },
        { type: 'insertText', text: 'Line 2' },
        { type: 'insertText', text: '\n' },
        { type: 'insertText', text: 'Line 3' }
      ]);
    });

    it('should combine newlines and sentence terminators', () => {
      const result = parseTranscriptToOps('First sentence.\nSecond sentence?');
      expect(result).toEqual([
        { type: 'insertText', text: 'First sentence' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: '\n' },
        { type: 'insertText', text: 'Second sentence' },
        { type: 'insertText', text: '?' }
      ]);
    });
  });

  describe('voice command parsing', () => {
    it('should parse voice commands into ops', () => {
      const result = parseTranscriptToOps('voicemark comma');
      expect(result).toEqual([
        { type: 'insertText', text: ',' }
      ]);
    });

    it('should parse multiple commands', () => {
      const result = parseTranscriptToOps('voicemark comma voicemark full stop');
      // This will be treated as one chunk since there are no terminators or newlines
      // The voiceCommandToEditorOp will not recognize this as a valid command
      // (unrecognized command with medium confidence), so nothing is inserted
      expect(result).toEqual([]);
    });

    it('should parse commands separated by terminators', () => {
      const result = parseTranscriptToOps('voicemark comma. voicemark full stop');
      expect(result).toEqual([
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: '.' }
      ]);
    });

    it('should parse format commands', () => {
      const result = parseTranscriptToOps('voicemark make bold');
      expect(result).toEqual([
        { type: 'format', style: 'bold', action: 'make' }
      ]);
    });

    it('should parse newline commands', () => {
      const result = parseTranscriptToOps('voicemark new line');
      expect(result).toEqual([
        { type: 'insertNewLine' }
      ]);
    });

    it('should parse paragraph commands', () => {
      const result = parseTranscriptToOps('voicemark new paragraph');
      expect(result).toEqual([
        { type: 'insertNewParagraph' }
      ]);
    });

    it('should mix text and commands', () => {
      const result = parseTranscriptToOps('Hello. voicemark comma. World');
      expect(result).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'World' }
      ]);
    });
  });

  describe('confirm handling', () => {
    it('should handle confirm commands by logging and inserting text', () => {
      // Mock console.log to verify it's called
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args: unknown[]) => {
        logs.push(args.join(' '));
      };

      const result = parseTranscriptToOps('voicemark delete last sentence');
      
      // Restore console.log
      console.log = originalLog;

      // Should have logged the confirmation
      expect(logs.some(log => log.includes('Confirmation skipped'))).toBe(true);
      expect(logs.some(log => log.includes('Delete the last sentence?'))).toBe(true);

      // Should insert the text as fallback
      expect(result).toEqual([
        { type: 'insertText', text: 'voicemark delete last sentence' }
      ]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle complex mixed content', () => {
      const result = parseTranscriptToOps('Hello world. This is a test? Yes it is!\nNew line here');
      expect(result).toEqual([
        { type: 'insertText', text: 'Hello world' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'This is a test' },
        { type: 'insertText', text: '?' },
        { type: 'insertText', text: 'Yes it is' },
        { type: 'insertText', text: '!' },
        { type: 'insertText', text: '\n' },
        { type: 'insertText', text: 'New line here' }
      ]);
    });

    it('should handle text with commands and terminators', () => {
      const result = parseTranscriptToOps('Start. voicemark make bold. End');
      expect(result).toEqual([
        { type: 'insertText', text: 'Start' },
        { type: 'insertText', text: '.' },
        { type: 'format', style: 'bold', action: 'make' },
        { type: 'insertText', text: '.' },
        { type: 'insertText', text: 'End' }
      ]);
    });

    it('should preserve spacing in text chunks', () => {
      const result = parseTranscriptToOps('  hello  world  ');
      expect(result).toEqual([
        { type: 'insertText', text: 'hello  world' }
      ]);
    });
  });

  describe('context passing', () => {
    it('should pass context to voiceCommandToEditorOp', () => {
      const result = parseTranscriptToOps('voicemark period', { locale: 'en-US' });
      expect(result).toEqual([
        { type: 'insertText', text: '.' }
      ]);
    });

    it('should support custom prefixes', () => {
      const result = parseTranscriptToOps('custom comma', { 
        prefixes: ['custom'] 
      });
      expect(result).toEqual([
        { type: 'insertText', text: ',' }
      ]);
    });
  });
});
