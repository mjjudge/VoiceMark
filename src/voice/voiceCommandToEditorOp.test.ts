/**
 * Tests for voiceCommandToEditorOp parser.
 */

import { describe, it, expect } from 'vitest';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

describe('voiceCommandToEditorOp', () => {
  describe('prefix handling', () => {
    it('should recognize "voicemark" prefix', () => {
      const result = voiceCommandToEditorOp('voicemark comma');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('insertText');
        if (result.op.type === 'insertText') {
          expect(result.op.text).toBe(',');
        }
      }
    });

    it('should recognize "voice mark" prefix', () => {
      const result = voiceCommandToEditorOp('voice mark comma');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('insertText');
        if (result.op.type === 'insertText') {
          expect(result.op.text).toBe(',');
        }
      }
    });

    it('should be case-insensitive for prefix', () => {
      const result = voiceCommandToEditorOp('VoiceMark comma');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('insertText');
      }
    });

    it('should return insert for text without prefix', () => {
      const result = voiceCommandToEditorOp('just some text');
      expect(result.kind).toBe('insert');
      if (result.kind === 'insert') {
        expect(result.text).toBe('just some text');
      }
    });
  });

  describe('formatting commands', () => {
    it('should parse "make bold"', () => {
      const result = voiceCommandToEditorOp('voicemark make bold');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('format');
        if (result.op.type === 'format') {
          expect(result.op.style).toBe('bold');
          expect(result.op.action).toBe('make');
        }
      }
    });

    it('should parse "unmake italic"', () => {
      const result = voiceCommandToEditorOp('voicemark unmake italic');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('format');
        if (result.op.type === 'format') {
          expect(result.op.style).toBe('italic');
          expect(result.op.action).toBe('unmake');
        }
      }
    });

    it('should parse "toggle underline"', () => {
      const result = voiceCommandToEditorOp('voicemark toggle underline');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('format');
        if (result.op.type === 'format') {
          expect(result.op.style).toBe('underline');
          expect(result.op.action).toBe('toggle');
        }
      }
    });
  });

  describe('deletion commands', () => {
    it('should parse "delete last word"', () => {
      const result = voiceCommandToEditorOp('voicemark delete last word');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('deleteLastWord');
      }
    });

    it('should parse "delete last sentence" with confirmation', () => {
      const result = voiceCommandToEditorOp('voicemark delete last sentence');
      expect(result.kind).toBe('confirm');
      if (result.kind === 'confirm') {
        expect(result.op.type).toBe('deleteLastSentence');
      }
    });
  });

  describe('punctuation commands', () => {
    it('should parse "comma"', () => {
      const result = voiceCommandToEditorOp('voicemark comma');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe(',');
      }
    });

    it('should parse "full stop"', () => {
      const result = voiceCommandToEditorOp('voicemark full stop');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('.');
      }
    });

    it('should parse "question mark"', () => {
      const result = voiceCommandToEditorOp('voicemark question mark');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('?');
      }
    });

    it('should parse "exclamation mark"', () => {
      const result = voiceCommandToEditorOp('voicemark exclamation mark');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('!');
      }
    });

    it('should parse "colon"', () => {
      const result = voiceCommandToEditorOp('voicemark colon');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe(':');
      }
    });

    it('should parse "semicolon"', () => {
      const result = voiceCommandToEditorOp('voicemark semicolon');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe(';');
      }
    });

    it('should parse "dash"', () => {
      const result = voiceCommandToEditorOp('voicemark dash');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('—');
      }
    });
  });

  describe('newline commands', () => {
    it('should parse "new line"', () => {
      const result = voiceCommandToEditorOp('voicemark new line');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('insertNewLine');
      }
    });

    it('should parse "new paragraph"', () => {
      const result = voiceCommandToEditorOp('voicemark new paragraph');
      expect(result.kind).toBe('op');
      if (result.kind === 'op') {
        expect(result.op.type).toBe('insertNewParagraph');
      }
    });
  });

  describe('locale handling', () => {
    it('should handle en-US "period" alias', () => {
      const result = voiceCommandToEditorOp('voicemark period', { locale: 'en-US' });
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('.');
      }
    });

    it('should default to en-GB', () => {
      const result = voiceCommandToEditorOp('voicemark full stop');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe('.');
      }
    });
  });

  describe('unrecognized commands', () => {
    it('should return insert for unrecognized command', () => {
      const result = voiceCommandToEditorOp('voicemark some unknown command');
      expect(result.kind).toBe('insert');
      if (result.kind === 'insert') {
        expect(result.text).toBe('voicemark some unknown command');
      }
    });
  });

  describe('whitespace normalization', () => {
    it('should normalize multiple spaces', () => {
      const result = voiceCommandToEditorOp('voicemark    comma');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe(',');
      }
    });

    it('should trim whitespace', () => {
      const result = voiceCommandToEditorOp('  voicemark comma  ');
      expect(result.kind).toBe('op');
      if (result.kind === 'op' && result.op.type === 'insertText') {
        expect(result.op.text).toBe(',');
      }
    });
  });
});
