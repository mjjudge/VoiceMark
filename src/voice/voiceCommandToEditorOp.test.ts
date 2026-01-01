/**
 * Tests for voiceCommandToEditorOp parser.
 */

import { describe, it, expect } from 'vitest';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

describe('voiceCommandToEditorOp', () => {
  describe('prefix handling', () => {
    it('should recognize "voicemark" prefix', () => {
      const result = voiceCommandToEditorOp('voicemark comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertText');
        if (result.ops[0].type === 'insertText') {
          expect(result.ops[0].text).toBe(',');
        }
      }
    });

    it('should recognize "voice mark" prefix', () => {
      const result = voiceCommandToEditorOp('voice mark comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertText');
        if (result.ops[0].type === 'insertText') {
          expect(result.ops[0].text).toBe(',');
        }
      }
    });

    it('should be case-insensitive for prefix', () => {
      const result = voiceCommandToEditorOp('VoiceMark comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertText');
      }
    });

    it('should return insert for text without prefix', () => {
      const result = voiceCommandToEditorOp('just some text');
      expect(result.kind).toBe('insert');
      if (result.kind === 'insert') {
        expect(result.text).toBe('just some text');
      }
    });

    it('should return no-op for exact prefix match', () => {
      const result = voiceCommandToEditorOp('voicemark');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(0);
      }
    });

    it('should accept custom prefixes', () => {
      const result = voiceCommandToEditorOp('hey assistant comma', {
        prefixes: ['hey assistant']
      });
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertText');
      }
    });

    it('should handle custom prefix without command', () => {
      const result = voiceCommandToEditorOp('custom prefix', {
        prefixes: ['custom prefix']
      });
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(0);
      }
    });
  });

  describe('formatting commands', () => {
    it('should parse "make bold"', () => {
      const result = voiceCommandToEditorOp('voicemark make bold');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
        if (result.ops[0].type === 'format') {
          expect(result.ops[0].style).toBe('bold');
          expect(result.ops[0].action).toBe('make');
        }
      }
    });

    it('should parse "unmake italic"', () => {
      const result = voiceCommandToEditorOp('voicemark unmake italic');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
        if (result.ops[0].type === 'format') {
          expect(result.ops[0].style).toBe('italic');
          expect(result.ops[0].action).toBe('unmake');
        }
      }
    });

    it('should parse "toggle underline"', () => {
      const result = voiceCommandToEditorOp('voicemark toggle underline');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
        if (result.ops[0].type === 'format') {
          expect(result.ops[0].style).toBe('underline');
          expect(result.ops[0].action).toBe('toggle');
        }
      }
    });

    it('should map "italics" alias to "italic"', () => {
      const result = voiceCommandToEditorOp('voicemark make italics');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
        if (result.ops[0].type === 'format') {
          expect(result.ops[0].style).toBe('italic');
          expect(result.ops[0].action).toBe('make');
        }
      }
    });

    it('should map "underlined" alias to "underline"', () => {
      const result = voiceCommandToEditorOp('voicemark toggle underlined');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
        if (result.ops[0].type === 'format') {
          expect(result.ops[0].style).toBe('underline');
          expect(result.ops[0].action).toBe('toggle');
        }
      }
    });
  });

  describe('deletion commands', () => {
    it('should parse "delete last word"', () => {
      const result = voiceCommandToEditorOp('voicemark delete last word');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('deleteLastWord');
      }
    });

    it('should parse "delete last sentence" with confirmation and prompt', () => {
      const result = voiceCommandToEditorOp('voicemark delete last sentence');
      expect(result.kind).toBe('confirm');
      if (result.kind === 'confirm') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('deleteLastSentence');
        expect(result.prompt).toBe('Delete the last sentence?');
      }
    });
  });

  describe('punctuation commands', () => {
    it('should parse "comma"', () => {
      const result = voiceCommandToEditorOp('voicemark comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe(',');
      }
    });

    it('should parse "full stop"', () => {
      const result = voiceCommandToEditorOp('voicemark full stop');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('.');
      }
    });

    it('should parse "question mark"', () => {
      const result = voiceCommandToEditorOp('voicemark question mark');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('?');
      }
    });

    it('should parse "exclamation mark"', () => {
      const result = voiceCommandToEditorOp('voicemark exclamation mark');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('!');
      }
    });

    it('should parse "colon"', () => {
      const result = voiceCommandToEditorOp('voicemark colon');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe(':');
      }
    });

    it('should parse "semicolon"', () => {
      const result = voiceCommandToEditorOp('voicemark semicolon');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe(';');
      }
    });

    it('should parse "dash" as hyphen-minus', () => {
      const result = voiceCommandToEditorOp('voicemark dash');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('-');
      }
    });
  });

  describe('newline commands', () => {
    it('should parse "new line"', () => {
      const result = voiceCommandToEditorOp('voicemark new line');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertNewLine');
      }
    });

    it('should parse "new paragraph"', () => {
      const result = voiceCommandToEditorOp('voicemark new paragraph');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertNewParagraph');
      }
    });
  });

  describe('locale handling', () => {
    it('should handle en-US "period" alias', () => {
      const result = voiceCommandToEditorOp('voicemark period', { locale: 'en-US' });
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('.');
      }
    });

    it('should default to en-GB', () => {
      const result = voiceCommandToEditorOp('voicemark full stop');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe('.');
      }
    });
  });

  describe('unrecognized commands', () => {
    it('should return empty ops with medium confidence for unrecognized command', () => {
      const result = voiceCommandToEditorOp('voicemark some unknown command');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(0);
        expect(result.confidence).toBe('medium');
      }
    });
  });

  describe('whitespace normalization', () => {
    it('should normalize multiple spaces', () => {
      const result = voiceCommandToEditorOp('voicemark    comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe(',');
      }
    });

    it('should trim whitespace', () => {
      const result = voiceCommandToEditorOp('  voicemark comma  ');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops' && result.ops[0]?.type === 'insertText') {
        expect(result.ops[0].text).toBe(',');
      }
    });
  });

  describe('confidence levels', () => {
    it('should return high confidence for recognized commands', () => {
      const result = voiceCommandToEditorOp('voicemark comma');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.confidence).toBe('high');
      }
    });

    it('should return medium confidence for unrecognized commands', () => {
      const result = voiceCommandToEditorOp('voicemark unknown command');
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.confidence).toBe('medium');
      }
    });
  });
});
