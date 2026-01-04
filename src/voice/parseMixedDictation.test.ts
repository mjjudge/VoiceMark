/**
 * Tests for parseMixedDictationToOps.
 */

import { describe, it, expect } from 'vitest';
import { parseMixedDictationToOps } from './parseMixedDictation';
import type { ParseContext } from './types';

const ctx: ParseContext = {
  locale: 'en-GB',
  prefixes: ['voicemark', 'voice mark']
};

describe('parseMixedDictationToOps', () => {
  describe('basic text and command mixing', () => {
    it('parses "Testing voicemark comma Hello" correctly', () => {
      const result = parseMixedDictationToOps('Testing voicemark comma Hello', ctx);
      
      // Should have 3 chunks: text "Testing", command comma, text "Hello"
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0]).toEqual({ kind: 'text', text: 'Testing' });
      expect(result.chunks[1]).toMatchObject({ kind: 'command' });
      expect(result.chunks[2]).toEqual({ kind: 'text', text: 'Hello' });
      
      // Immediate ops: insert "Testing", insert ",", insert " Hello" (with space after punctuation)
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Testing' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' Hello' }
      ]);
      
      // No confirmation needed
      expect(result.confirm).toBeUndefined();
      expect(result.pendingOps).toEqual([]);
    });

    it('parses "Hello voicemark new paragraph World" correctly', () => {
      const result = parseMixedDictationToOps('Hello voicemark new paragraph World', ctx);
      
      // Should have 3 chunks: text "Hello", command new paragraph, text "World"
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0]).toEqual({ kind: 'text', text: 'Hello' });
      expect(result.chunks[1]).toMatchObject({ kind: 'command' });
      expect(result.chunks[2]).toEqual({ kind: 'text', text: 'World' });
      
      // Immediate ops: insert "Hello", insertNewParagraph, insert "World" (no leading space after newline)
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertNewParagraph' },
        { type: 'insertText', text: 'World' }
      ]);
      
      // No confirmation needed
      expect(result.confirm).toBeUndefined();
    });
  });

  describe('destructive commands with confirmation', () => {
    it('parses "X voicemark delete last sentence Y" with confirmation', () => {
      const result = parseMixedDictationToOps('X voicemark delete last sentence Y', ctx);
      
      // Should have 3 chunks: text "X", command delete last sentence, text "Y"
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0]).toEqual({ kind: 'text', text: 'X' });
      expect(result.chunks[1]).toMatchObject({ kind: 'command' });
      expect(result.chunks[2]).toEqual({ kind: 'text', text: 'Y' });
      
      // Immediate ops: only insert "X" (before the confirm command)
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'X' }
      ]);
      
      // Confirmation required
      expect(result.confirm).toBeDefined();
      expect(result.confirm?.prompt).toBe('Delete the last sentence?');
      expect(result.confirm?.sourceText).toBe('voicemark delete last sentence');
      
      // Pending ops: deleteLastSentence, then insert " Y" (with space after command)
      expect(result.pendingOps).toEqual([
        { type: 'deleteLastSentence' },
        { type: 'insertText', text: ' Y' }
      ]);
      
      // allOps includes everything if confirmed
      expect(result.confirm?.allOps).toEqual([
        { type: 'insertText', text: 'X' },
        { type: 'deleteLastSentence' },
        { type: 'insertText', text: ' Y' }
      ]);
    });

    it('handles confirm command at the start', () => {
      const result = parseMixedDictationToOps('voicemark delete last sentence done', ctx);
      
      // Immediate ops should be empty (confirm is first)
      expect(result.immediateOps).toEqual([]);
      
      // Confirmation required
      expect(result.confirm).toBeDefined();
      expect(result.confirm?.prompt).toBe('Delete the last sentence?');
      
      // Pending ops: deleteLastSentence + " done" (with space)
      expect(result.pendingOps).toEqual([
        { type: 'deleteLastSentence' },
        { type: 'insertText', text: ' done' }
      ]);
    });
  });

  describe('command-only input', () => {
    it('parses a single command without text', () => {
      const result = parseMixedDictationToOps('voicemark comma', ctx);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: ',' }
      ]);
      expect(result.confirm).toBeUndefined();
    });

    it('parses multiple commands in sequence', () => {
      const result = parseMixedDictationToOps('voicemark comma voicemark full stop', ctx);
      
      expect(result.chunks).toHaveLength(2);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: '.' }
      ]);
    });
  });

  describe('text-only input', () => {
    it('parses plain text without commands', () => {
      const result = parseMixedDictationToOps('Hello world', ctx);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toEqual({ kind: 'text', text: 'Hello world' });
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello world' }
      ]);
    });
  });

  describe('case insensitivity', () => {
    it('handles VoiceMark with mixed case', () => {
      const result = parseMixedDictationToOps('Hello VoiceMark comma world', ctx);
      
      expect(result.chunks).toHaveLength(3);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' world' }
      ]);
    });

    it('handles "Voice Mark" two-word prefix', () => {
      const result = parseMixedDictationToOps('Hello Voice Mark new line world', ctx);
      
      expect(result.chunks).toHaveLength(3);
      // No leading space after new line
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertNewLine' },
        { type: 'insertText', text: 'world' }
      ]);
    });
  });

  describe('unsupported commands', () => {
    it('treats unknown command as text', () => {
      const result = parseMixedDictationToOps('Hello voicemark do something weird', ctx);
      
      // voicemark followed by unknown command should treat "voicemark" as text
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      
      // The prefix without a valid command should be treated as text
      const textChunks = result.chunks.filter(c => c.kind === 'text');
      expect(textChunks.length).toBeGreaterThan(0);
    });
  });

  describe('preserves original casing in text', () => {
    it('preserves casing in inserted text', () => {
      const result = parseMixedDictationToOps('HELLO voicemark comma World', ctx);
      
      expect(result.immediateOps[0]).toEqual({ type: 'insertText', text: 'HELLO' });
      expect(result.immediateOps[2]).toEqual({ type: 'insertText', text: ' World' });
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseMixedDictationToOps('', ctx);
      
      expect(result.chunks).toEqual([]);
      expect(result.immediateOps).toEqual([]);
      expect(result.confirm).toBeUndefined();
    });

    it('handles whitespace-only input', () => {
      const result = parseMixedDictationToOps('   ', ctx);
      
      expect(result.chunks).toEqual([]);
      expect(result.immediateOps).toEqual([]);
    });

    it('handles command at end of string', () => {
      const result = parseMixedDictationToOps('Hello voicemark full stop', ctx);
      
      expect(result.chunks).toHaveLength(2);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '.' }
      ]);
    });
  });

  describe('Whisper artifact filtering', () => {
    it('filters out [BLANK_AUDIO] artifact', () => {
      const result = parseMixedDictationToOps('[BLANK_AUDIO] Hello world', ctx);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toEqual({ kind: 'text', text: 'Hello world' });
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello world' }
      ]);
    });

    it('filters out multiple artifacts', () => {
      const result = parseMixedDictationToOps('[MUSIC] Hello [NOISE] world [BLANK_AUDIO]', ctx);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello  world' }
      ]);
    });

    it('returns empty for artifact-only input', () => {
      const result = parseMixedDictationToOps('[BLANK_AUDIO]', ctx);
      
      expect(result.chunks).toEqual([]);
      expect(result.immediateOps).toEqual([]);
    });

    it('filters artifacts while preserving commands', () => {
      const result = parseMixedDictationToOps('[BLANK_AUDIO] Hello voicemark comma world', ctx);
      
      expect(result.chunks).toHaveLength(3);
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' world' }
      ]);
    });
  });

  describe('fuzzy command matching', () => {
    it('handles "escalimation mark" → "exclamation mark"', () => {
      const result = parseMixedDictationToOps('Hello voicemark escalimation mark', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '!' }
      ]);
    });

    it('handles "fullstop" → "full stop"', () => {
      const result = parseMixedDictationToOps('Done voicemark fullstop', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Done' },
        { type: 'insertText', text: '.' }
      ]);
    });

    it('handles "new paragraf" → "new paragraph"', () => {
      const result = parseMixedDictationToOps('First voicemark new paragraf Second', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'First' },
        { type: 'insertNewParagraph' },
        { type: 'insertText', text: 'Second' }
      ]);
    });

    it('handles "coma" → "comma"', () => {
      const result = parseMixedDictationToOps('A voicemark coma B', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'A' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' B' }
      ]);
    });
  });

  describe('punctuation after prefix handling', () => {
    it('skips comma after Voice Mark prefix', () => {
      const result = parseMixedDictationToOps('Hello Voice Mark, comma world', ctx);
      
      // Should recognize the comma command despite the comma after "Voice Mark"
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' world' }
      ]);
    });

    it('skips colon after Voice Mark prefix', () => {
      const result = parseMixedDictationToOps('Hello Voice Mark: question mark', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '?' }
      ]);
    });
  });

  describe('punctuation deduplication', () => {
    it('strips trailing period before full stop command', () => {
      const result = parseMixedDictationToOps('Hello. voicemark full stop', ctx);
      
      // Should produce "Hello." not "Hello.."
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '.' }
      ]);
    });

    it('strips trailing question mark before question mark command', () => {
      const result = parseMixedDictationToOps('What? voicemark question mark', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'What' },
        { type: 'insertText', text: '?' }
      ]);
    });

    it('strips trailing comma before comma command', () => {
      const result = parseMixedDictationToOps('Hello, voicemark comma World', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: ',' },
        { type: 'insertText', text: ' World' }
      ]);
    });

    it('does not strip when there is no trailing punctuation', () => {
      const result = parseMixedDictationToOps('Hello voicemark full stop', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertText', text: '.' }
      ]);
    });
  });

  describe('post-command punctuation stripping', () => {
    it('strips leading punctuation from text after new paragraph command', () => {
      const result = parseMixedDictationToOps('Hello Voice Mark new paragraph. World', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Hello' },
        { type: 'insertNewParagraph' },
        { type: 'insertText', text: 'World' }
      ]);
    });

    it('strips leading punctuation from text after exclamation command', () => {
      const result = parseMixedDictationToOps('Wow Voice Mark esklimation mark. More', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Wow' },
        { type: 'insertText', text: '!' },
        { type: 'insertText', text: ' More' }
      ]);
    });

    it('handles full transcript with trailing punctuation after commands', () => {
      const result = parseMixedDictationToOps('Start Voice Mark new paragraph. End', ctx);
      
      expect(result.immediateOps).toEqual([
        { type: 'insertText', text: 'Start' },
        { type: 'insertNewParagraph' },
        { type: 'insertText', text: 'End' }
      ]);
    });
  });
});
