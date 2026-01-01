/**
 * Tests for parseTranscriptToOps parser.
 */

import { describe, it, expect } from 'vitest';
import { parseTranscriptToOps } from './parseTranscriptToOps';

describe('parseTranscriptToOps', () => {
  describe('empty and whitespace handling', () => {
    it('should return empty array for empty string', () => {
      const result = parseTranscriptToOps('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      const result = parseTranscriptToOps('   \n  \t  ');
      expect(result).toEqual([]);
    });
  });

  describe('plain text handling', () => {
    it('should handle simple text without terminators', () => {
      const result = parseTranscriptToOps('hello world');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'hello world' });
    });

    it('should handle text with single sentence terminator', () => {
      const result = parseTranscriptToOps('Hello world.');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Hello world.' });
    });

    it('should handle text with question mark', () => {
      const result = parseTranscriptToOps('How are you?');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'How are you?' });
    });

    it('should handle text with exclamation mark', () => {
      const result = parseTranscriptToOps('Great job!');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Great job!' });
    });
  });

  describe('sentence boundary handling', () => {
    it('should split on period', () => {
      const result = parseTranscriptToOps('First sentence. Second sentence.');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First sentence.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second sentence.' });
    });

    it('should split on question mark', () => {
      const result = parseTranscriptToOps('First question? Second question?');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First question?' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second question?' });
    });

    it('should split on exclamation mark', () => {
      const result = parseTranscriptToOps('First! Second!');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First!' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second!' });
    });

    it('should handle mixed terminators', () => {
      const result = parseTranscriptToOps('Statement. Question? Exclamation!');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Statement.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Question?' });
      expect(result[2]).toEqual({ type: 'insertText', text: 'Exclamation!' });
    });
  });

  describe('newline handling', () => {
    it('should split on newline characters', () => {
      const result = parseTranscriptToOps('First line\nSecond line');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First line' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second line' });
    });

    it('should handle multiple newlines', () => {
      const result = parseTranscriptToOps('Line one\nLine two\nLine three');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Line one' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Line two' });
      expect(result[2]).toEqual({ type: 'insertText', text: 'Line three' });
    });

    it('should combine newlines and sentence terminators', () => {
      const result = parseTranscriptToOps('First sentence.\nSecond line');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First sentence.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second line' });
    });
  });

  describe('voice command handling', () => {
    it('should parse punctuation command', () => {
      const result = parseTranscriptToOps('voicemark comma');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should parse formatting command', () => {
      const result = parseTranscriptToOps('voicemark make bold');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'format',
        style: 'bold',
        action: 'make'
      });
    });

    it('should parse delete last word command', () => {
      const result = parseTranscriptToOps('voicemark delete last word');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'deleteLastWord' });
    });

    it('should parse new line command', () => {
      const result = parseTranscriptToOps('voicemark new line');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertNewLine' });
    });

    it('should parse new paragraph command', () => {
      const result = parseTranscriptToOps('voicemark new paragraph');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertNewParagraph' });
    });
  });

  describe('mixed content handling', () => {
    it('should handle text followed by command in separate sentences', () => {
      const result = parseTranscriptToOps('Hello. voicemark comma');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Hello.' });
      expect(result[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should treat command with trailing text as plain text', () => {
      // "voicemark comma World" is one chunk (no terminator)
      // voiceCommandToEditorOp will return kind: 'insert' for the whole thing
      const result = parseTranscriptToOps('voicemark comma World');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'voicemark comma World' });
    });

    it('should handle text, then command-like text with exclamation', () => {
      // Split into: "Hello." and "voicemark comma World!"
      const result = parseTranscriptToOps('Hello. voicemark comma World!');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Hello.' });
      // "voicemark comma World!" is treated as insert text
      expect(result[1]).toEqual({ type: 'insertText', text: 'voicemark comma World!' });
    });

    it('should treat multiple commands without separators as plain text', () => {
      // "voicemark comma voicemark full stop" is one chunk
      // voiceCommandToEditorOp will return kind: 'insert' for the whole thing
      const result = parseTranscriptToOps('voicemark comma voicemark full stop');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: 'voicemark comma voicemark full stop' });
    });

    it('should handle properly separated commands', () => {
      // Note: "voicemark comma." is an unrecognized command (because of the trailing period)
      // so it gets treated as plain text. To properly separate commands, use spaces or newlines.
      const result = parseTranscriptToOps('voicemark comma. voicemark full stop.');
      // Each chunk: "voicemark comma." → reparse to "voicemark comma" → inserts ","  + "."
      // "voicemark full stop." → reparse to "voicemark full stop" → inserts "." + "."
      // Total: "," + "." + "." + "."
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'insertText', text: ',' });
      expect(result[1]).toEqual({ type: 'insertText', text: '.' });
      expect(result[2]).toEqual({ type: 'insertText', text: '.' });
      expect(result[3]).toEqual({ type: 'insertText', text: '.' });
    });
  });

  describe('confirm kind handling', () => {
    it('should treat confirm commands as insertText and log', () => {
      // Spy on console.log to verify logging
      const originalLog = console.log;
      const logs: string[][] = [];
      console.log = (...args: string[]) => {
        logs.push(args);
      };

      const result = parseTranscriptToOps('voicemark delete last sentence');
      
      // Restore console.log
      console.log = originalLog;

      // Should insert the original text
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'insertText',
        text: 'voicemark delete last sentence'
      });

      // Should have logged - check if any log contains the confirm message
      expect(logs.length).toBeGreaterThan(0);
      const hasConfirmLog = logs.some(logArgs => 
        logArgs.some(arg => typeof arg === 'string' && arg.includes('Confirm-type command'))
      );
      expect(hasConfirmLog).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle text ending without terminator', () => {
      const result = parseTranscriptToOps('First. Second');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second' });
    });

    it('should handle consecutive terminators', () => {
      const result = parseTranscriptToOps('Wait... Really?!');
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Wait.' });
      expect(result[1]).toEqual({ type: 'insertText', text: '.' });
      expect(result[2]).toEqual({ type: 'insertText', text: '.' });
      expect(result[3]).toEqual({ type: 'insertText', text: 'Really?' });
      expect(result[4]).toEqual({ type: 'insertText', text: '!' });
    });

    it('should handle terminators with whitespace', () => {
      const result = parseTranscriptToOps('First .  Second ?  Third !');
      // "First ." -> "First ."
      // "Second ?" -> "Second ?"
      // "Third !" -> "Third !"
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First .' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second ?' });
      expect(result[2]).toEqual({ type: 'insertText', text: 'Third !' });
    });

    it('should handle empty command (prefix only) as plain text', () => {
      // Empty command (just prefix) gets treated as text
      const result = parseTranscriptToOps('voicemark');
      expect(result).toEqual([{ type: 'insertText', text: 'voicemark' }]);
    });

    it('should handle unrecognized command as plain text', () => {
      // Unrecognized commands get inserted as text
      const result = parseTranscriptToOps('voicemark unknown command');
      expect(result).toEqual([{ type: 'insertText', text: 'voicemark unknown command' }]);
    });
  });

  describe('context parameter handling', () => {
    it('should pass context to voiceCommandToEditorOp', () => {
      const result = parseTranscriptToOps('voicemark period', { locale: 'en-US' });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should handle custom prefixes from context', () => {
      const result = parseTranscriptToOps('custom prefix comma', {
        prefixes: ['custom prefix']
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'insertText', text: ',' });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle a typical dictation session', () => {
      const transcript = 'Hello world. How are you today? I am doing great!';
      const result = parseTranscriptToOps(transcript);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'insertText', text: 'Hello world.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'How are you today?' });
      expect(result[2]).toEqual({ type: 'insertText', text: 'I am doing great!' });
    });

    it('should handle dictation with voice commands properly separated', () => {
      // Commands need sentence terminators to be separate chunks
      const transcript = 'This is bold text. voicemark make bold. Now bold. voicemark unmake bold. Regular again.';
      const result = parseTranscriptToOps(transcript);
      // Chunks: "This is bold text.", "voicemark make bold.", "Now bold.", "voicemark unmake bold.", "Regular again."
      // "voicemark make bold." → format + "."
      // "voicemark unmake bold." → format + "."
      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({ type: 'insertText', text: 'This is bold text.' });
      expect(result[1]).toEqual({ type: 'format', style: 'bold', action: 'make' });
      expect(result[2]).toEqual({ type: 'insertText', text: '.' });
      expect(result[3]).toEqual({ type: 'insertText', text: 'Now bold.' });
      expect(result[4]).toEqual({ type: 'format', style: 'bold', action: 'unmake' });
      expect(result[5]).toEqual({ type: 'insertText', text: '.' });
      expect(result[6]).toEqual({ type: 'insertText', text: 'Regular again.' });
    });

    it('should handle multi-line notes', () => {
      const transcript = 'First paragraph.\nSecond paragraph.\nThird paragraph.';
      const result = parseTranscriptToOps(transcript);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'insertText', text: 'First paragraph.' });
      expect(result[1]).toEqual({ type: 'insertText', text: 'Second paragraph.' });
      expect(result[2]).toEqual({ type: 'insertText', text: 'Third paragraph.' });
    });
  });
});
