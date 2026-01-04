/**
 * Tests for parseInlineVoiceMark - multiple command parsing from single ASR final.
 * 
 * SPACING RULES:
 * - Text BEFORE punctuation: NO trailing space (punctuation attaches directly: "Hello,")
 * - Text BEFORE non-punctuation commands (formatting, deletion): NO trailing space
 * - Text AFTER punctuation: has LEADING space (" world")
 * - Text AFTER newline commands: NO leading space (starts at beginning of new line)
 * - Text AFTER non-punctuation commands: has LEADING space (" world")
 * 
 * The result: "Hello, world" not "Hello , world"
 */

import { describe, it, expect } from 'vitest';
import { parseInlineVoiceMark } from './parseInlineVoiceMark';
import type { ParseContext } from './types';

const DEFAULT_CONTEXT: ParseContext = {
  locale: 'en-GB',
  prefixes: ['voicemark', 'voice mark']
};

describe('parseInlineVoiceMark', () => {
  describe('required test cases', () => {
    it('should parse: "My name is Marcus voicemark comma what\'s your name voicemark new paragraph"', () => {
      const text = "My name is Marcus voicemark comma what's your name voicemark new paragraph";
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Expected operations with correct spacing:
      // 1. insertText("My name is Marcus") - no trailing space before punctuation
      // 2. insertText(",")
      // 3. insertText(" what's your name") - leading space after punctuation, no trailing space before newline
      // 4. insertNewParagraph
      
      expect(ops).toHaveLength(4);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'My name is Marcus' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: " what's your name" });
      expect(ops[3]).toEqual({ type: 'insertNewParagraph' });
    });

    it('should parse: "voicemark comma voicemark full stop"', () => {
      const text = 'voicemark comma voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Expected operations:
      // 1. insertText(",")
      // 2. insertText(".")
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should parse: "hello voice mark make bold world"', () => {
      const text = 'hello voice mark make bold world';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Expected operations:
      // 1. insertText("hello") - no trailing space before formatting command
      // 2. format(bold, make)
      // 3. insertText(" world") - leading space after formatting command
      
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'hello' });
      expect(ops[1]).toEqual({ type: 'format', style: 'bold', action: 'make' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' world' });
    });
  });

  describe('single command parsing', () => {
    it('should parse single command with text before', () => {
      const text = 'Hello world voicemark comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello world' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should parse single command with text after', () => {
      const text = 'voicemark comma and then more text';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ' and then more text' });
    });

    it('should parse single command with text before and after', () => {
      const text = 'Start voicemark full stop End';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Start' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' End' });
    });
  });

  describe('multiple command parsing', () => {
    it('should parse two punctuation commands', () => {
      const text = 'First voicemark comma second voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(4);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'First' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' second' });
      expect(ops[3]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should parse three commands in sequence', () => {
      const text = 'A voicemark comma B voicemark full stop C voicemark question mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(6);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'A' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' B' });
      expect(ops[3]).toEqual({ type: 'insertText', text: '.' });
      expect(ops[4]).toEqual({ type: 'insertText', text: ' C' });
      expect(ops[5]).toEqual({ type: 'insertText', text: '?' });
    });

    it('should handle consecutive commands without text between', () => {
      const text = 'Start voicemark comma voicemark full stop end';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(4);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Start' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: '.' });
      expect(ops[3]).toEqual({ type: 'insertText', text: ' end' });
    });
  });

  describe('formatting commands', () => {
    it('should parse make bold command', () => {
      const text = 'voicemark make bold';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'bold', action: 'make' });
    });

    it('should parse unmake italic command', () => {
      const text = 'voicemark unmake italic';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'italic', action: 'unmake' });
    });

    it('should parse toggle underline command', () => {
      const text = 'voicemark toggle underline';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'underline', action: 'toggle' });
    });

    it('should handle formatting with text', () => {
      const text = 'Make this voicemark make bold bold text voicemark unmake bold normal again';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(5);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Make this' });
      expect(ops[1]).toEqual({ type: 'format', style: 'bold', action: 'make' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' bold text' });
      expect(ops[3]).toEqual({ type: 'format', style: 'bold', action: 'unmake' });
      expect(ops[4]).toEqual({ type: 'insertText', text: ' normal again' });
    });
  });

  describe('newline commands', () => {
    it('should parse new line command', () => {
      const text = 'First line voicemark new line second line';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'First line' });
      expect(ops[1]).toEqual({ type: 'insertNewLine' });
      // Text after newline: NO leading space (starts at beginning of new line)
      expect(ops[2]).toEqual({ type: 'insertText', text: 'second line' });
    });

    it('should parse new paragraph command', () => {
      const text = 'First paragraph voicemark new paragraph second paragraph';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'First paragraph' });
      expect(ops[1]).toEqual({ type: 'insertNewParagraph' });
      // Text after newline: NO leading space (starts at beginning of new paragraph)
      expect(ops[2]).toEqual({ type: 'insertText', text: 'second paragraph' });
    });
  });

  describe('deletion commands', () => {
    it('should parse delete last word command', () => {
      const text = 'Some text here voicemark delete last word';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Some text here' });
      expect(ops[1]).toEqual({ type: 'deleteLastWord' });
    });

    it('should execute delete last sentence command', () => {
      const text = 'voicemark delete last sentence';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Delete last sentence executes immediately in inline ASR parsing
      // (confirmation flow is only for Dev Command Runner with UI)
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'deleteLastSentence' });
    });
  });

  describe('all punctuation commands', () => {
    it('should parse colon command', () => {
      const text = 'voicemark colon';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: ':' });
    });

    it('should parse semicolon command', () => {
      const text = 'voicemark semicolon';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: ';' });
    });

    it('should parse dash command', () => {
      const text = 'voicemark dash';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: '-' });
    });

    it('should parse exclamation mark command', () => {
      const text = 'voicemark exclamation mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: '!' });
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase prefix', () => {
      const text = 'Hello VOICEMARK comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should handle mixed case prefix', () => {
      const text = 'Hello VoIcEmArK comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should handle "voice mark" with various casing', () => {
      const text = 'Test Voice Mark comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Test' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });
  });

  describe('whole-word matching', () => {
    it('should not match prefix as substring', () => {
      const text = 'The invoicemark is here';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'The invoicemark is here' });
    });

    it('should not match prefix in compound word', () => {
      const text = 'This is voicemarkable';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'This is voicemarkable' });
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace from text before commands', () => {
      const text = 'Hello     voicemark comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should preserve internal spaces in text', () => {
      const text = 'Hello   world voicemark comma';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello   world' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const text = '';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(0);
    });

    it('should handle text with no commands', () => {
      const text = 'Just plain text here';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Just plain text here' });
    });

    it('should handle prefix alone', () => {
      const text = 'voicemark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Prefix with no command should be treated as text
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'voicemark ' });
    });

    it('should handle unsupported command as text', () => {
      const text = 'voicemark unknown command here';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Unsupported command: prefix is treated as text, then remaining text follows
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'voicemark ' });
      expect(ops[1]).toEqual({ type: 'insertText', text: 'unknown command here' });
    });

    it('should handle trailing whitespace', () => {
      const text = 'Hello voicemark comma   ';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should strip comma after prefix (Whisper artifact)', () => {
      // Whisper often adds punctuation after "Voice Mark" like: "Voice Mark, question mark"
      const text = 'Hello Voice Mark, question mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '?' });
    });

    it('should strip colon after prefix (Whisper artifact)', () => {
      const text = 'Voice Mark: new paragraph';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertNewParagraph' });
    });

    it('should strip semicolon after prefix (Whisper artifact)', () => {
      const text = 'Voice Mark; make bold';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'bold', action: 'make' });
    });

    it('should handle multiple commands with commas after prefix', () => {
      const text = 'Hello Voice Mark, comma world Voice Mark, full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(4);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' world' });
      expect(ops[3]).toEqual({ type: 'insertText', text: '.' });
    });
  });

  describe('prefix variations', () => {
    it('should work with single prefix', () => {
      const context: ParseContext = {
        locale: 'en-GB',
        prefixes: ['voicemark']
      };
      
      const text = 'Hello voicemark comma';
      const ops = parseInlineVoiceMark(text, context);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });

    it('should work with custom prefix', () => {
      const context: ParseContext = {
        locale: 'en-GB',
        prefixes: ['hey assistant']
      };
      
      const text = 'Hello hey assistant comma';
      const ops = parseInlineVoiceMark(text, context);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
    });
  });

  describe('formatting aliases', () => {
    it('should handle "italics" alias', () => {
      const text = 'voicemark make italics';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'italic', action: 'make' });
    });

    it('should handle "underlined" alias', () => {
      const text = 'voicemark toggle underlined';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'format', style: 'underline', action: 'toggle' });
    });
  });

  describe('spacing verification (concatenation produces correct output)', () => {
    it('should produce "Hello, world." when concatenated', () => {
      const text = 'Hello voicemark comma world voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Concatenate all insertText ops
      const result = ops
        .filter(op => op.type === 'insertText')
        .map(op => (op as { type: 'insertText'; text: string }).text)
        .join('');
      
      expect(result).toBe('Hello, world.');
    });

    it('should produce "First. Second!" when concatenated', () => {
      const text = 'First voicemark full stop Second voicemark exclamation mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      const result = ops
        .filter(op => op.type === 'insertText')
        .map(op => (op as { type: 'insertText'; text: string }).text)
        .join('');
      
      expect(result).toBe('First. Second!');
    });

    it('should produce "A, B, C." with multiple commas', () => {
      const text = 'A voicemark comma B voicemark comma C voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      const result = ops
        .filter(op => op.type === 'insertText')
        .map(op => (op as { type: 'insertText'; text: string }).text)
        .join('');
      
      expect(result).toBe('A, B, C.');
    });
  });

  describe('Whisper artifact filtering', () => {
    it('should filter out [BLANK_AUDIO] from text', () => {
      const text = 'Hello world [BLANK_AUDIO]';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello world' });
    });

    it('should filter out [BLANK_AUDIO] from middle of text', () => {
      const text = 'Hello [BLANK_AUDIO] world';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello  world' });
    });

    it('should filter out multiple Whisper artifacts', () => {
      const text = '[MUSIC] Hello [BLANK_AUDIO] world [NOISE]';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello  world' });
    });

    it('should return empty ops if only artifact remains', () => {
      const text = '[BLANK_AUDIO]';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(0);
    });

    it('should handle artifacts with commands', () => {
      const text = 'Hello voicemark comma [BLANK_AUDIO] world';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' world' });
    });
  });

  describe('fuzzy command matching', () => {
    it('should handle "escalimation mark" as "exclamation mark"', () => {
      const text = 'Hello voicemark escalimation mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Hello' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '!' });
    });

    it('should handle "esclamation mark" as "exclamation mark"', () => {
      const text = 'Wow voicemark esclamation mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[1]).toEqual({ type: 'insertText', text: '!' });
    });

    it('should handle "fullstop" as "full stop"', () => {
      const text = 'Done voicemark fullstop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should handle "new paragraf" as "new paragraph"', () => {
      const text = 'Line one voicemark new paragraf Line two';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(3);
      expect(ops[1]).toEqual({ type: 'insertNewParagraph' });
    });
  });

  describe('punctuation deduplication', () => {
    it('should strip trailing period when followed by full stop command', () => {
      const text = 'This is done. voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Should strip the period from "done." before adding the command's period
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'This is done' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should strip trailing question mark when followed by question mark command', () => {
      const text = 'Is this done? voicemark question mark';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'Is this done' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '?' });
    });

    it('should not strip punctuation from command-inserted punctuation', () => {
      const text = 'voicemark comma voicemark full stop';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // Both punctuation commands should remain
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ type: 'insertText', text: ',' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
    });

    it('should handle mixed Whisper punctuation and commands', () => {
      // In this case, Whisper transcribes "First sentence." and the user says "voicemark full stop"
      // The trailing period from "sentence." should be stripped before the command adds "."
      const text = 'First sentence. voicemark full stop Second sentence';
      const ops = parseInlineVoiceMark(text, DEFAULT_CONTEXT);
      
      // "First sentence." should have trailing period stripped, command adds "."
      // Then " Second sentence" follows
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({ type: 'insertText', text: 'First sentence' });
      expect(ops[1]).toEqual({ type: 'insertText', text: '.' });
      expect(ops[2]).toEqual({ type: 'insertText', text: ' Second sentence' });
    });
  });
});
