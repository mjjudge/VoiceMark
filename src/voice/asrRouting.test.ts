/**
 * Tests for ASR routing logic.
 * Tests the integration of ASR final events with voiceCommandToEditorOp.
 */

import { describe, it, expect } from 'vitest';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

const VOICE_CONFIG = {
  locale: 'en-GB' as const,
  prefixes: ['voicemark', 'voice mark']
};

describe('ASR routing logic', () => {
  describe('insert routing', () => {
    it('should route plain text as insert with text preserved', () => {
      const result = voiceCommandToEditorOp('Hello world', VOICE_CONFIG);
      expect(result.kind).toBe('insert');
      if (result.kind === 'insert') {
        expect(result.text).toBe('Hello world');
      }
    });

    it('should route text without prefix as insert', () => {
      const result = voiceCommandToEditorOp('This is a normal sentence', VOICE_CONFIG);
      expect(result.kind).toBe('insert');
      if (result.kind === 'insert') {
        expect(result.text).toBe('This is a normal sentence');
      }
    });
  });

  describe('ops routing', () => {
    it('should route punctuation commands as ops', () => {
      const result = voiceCommandToEditorOp('voicemark comma', VOICE_CONFIG);
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('insertText');
        if (result.ops[0].type === 'insertText') {
          expect(result.ops[0].text).toBe(',');
        }
      }
    });

    it('should route formatting commands as ops', () => {
      const result = voiceCommandToEditorOp('voicemark make bold', VOICE_CONFIG);
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('format');
      }
    });

    it('should route delete word command as ops', () => {
      const result = voiceCommandToEditorOp('voicemark delete last word', VOICE_CONFIG);
      expect(result.kind).toBe('ops');
      if (result.kind === 'ops') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('deleteLastWord');
      }
    });
  });

  describe('confirm routing', () => {
    it('should route delete sentence command as confirm', () => {
      const result = voiceCommandToEditorOp('voicemark delete last sentence', VOICE_CONFIG);
      expect(result.kind).toBe('confirm');
      if (result.kind === 'confirm') {
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0].type).toBe('deleteLastSentence');
        expect(result.prompt).toBe('Delete the last sentence?');
      }
    });

    it('should include prompt in confirm result', () => {
      const result = voiceCommandToEditorOp('voice mark delete last sentence', VOICE_CONFIG);
      expect(result.kind).toBe('confirm');
      if (result.kind === 'confirm') {
        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);
      }
    });
  });
});
