/**
 * Tests for text buffer spacing utilities.
 */

import { describe, it, expect } from 'vitest';
import { normalizeSpacing, shouldInsertSpaceBefore } from './textBuffer';

describe('shouldInsertSpaceBefore', () => {
  it('should return false for text starting with comma', () => {
    expect(shouldInsertSpaceBefore(',')).toBe(false);
    expect(shouldInsertSpaceBefore(', and')).toBe(false);
  });

  it('should return false for text starting with period', () => {
    expect(shouldInsertSpaceBefore('.')).toBe(false);
    expect(shouldInsertSpaceBefore('. Then')).toBe(false);
  });

  it('should return false for text starting with exclamation', () => {
    expect(shouldInsertSpaceBefore('!')).toBe(false);
    expect(shouldInsertSpaceBefore('! Yes')).toBe(false);
  });

  it('should return false for text starting with question mark', () => {
    expect(shouldInsertSpaceBefore('?')).toBe(false);
    expect(shouldInsertSpaceBefore('? Really')).toBe(false);
  });

  it('should return false for text starting with semicolon', () => {
    expect(shouldInsertSpaceBefore(';')).toBe(false);
    expect(shouldInsertSpaceBefore('; however')).toBe(false);
  });

  it('should return false for text starting with colon', () => {
    expect(shouldInsertSpaceBefore(':')).toBe(false);
    expect(shouldInsertSpaceBefore(': example')).toBe(false);
  });

  it('should return true for text starting with regular characters', () => {
    expect(shouldInsertSpaceBefore('Hello')).toBe(true);
    expect(shouldInsertSpaceBefore('world')).toBe(true);
    expect(shouldInsertSpaceBefore('123')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(shouldInsertSpaceBefore('')).toBe(false);
  });
});

describe('normalizeSpacing', () => {
  describe('basic word spacing', () => {
    it('should insert space between two words', () => {
      expect(normalizeSpacing('Hello', 'world')).toBe(' ');
    });

    it('should insert space after word ending with period', () => {
      expect(normalizeSpacing('Hello.', 'World')).toBe(' ');
    });

    it('should insert space after word ending with exclamation', () => {
      expect(normalizeSpacing('Hello!', 'World')).toBe(' ');
    });

    it('should insert space after word ending with question mark', () => {
      expect(normalizeSpacing('Hello?', 'World')).toBe(' ');
    });
  });

  describe('punctuation handling', () => {
    it('should not insert space before comma', () => {
      expect(normalizeSpacing('Hello', ',')).toBe('');
    });

    it('should not insert space before period', () => {
      expect(normalizeSpacing('Hello', '.')).toBe('');
    });

    it('should not insert space before exclamation', () => {
      expect(normalizeSpacing('Hello', '!')).toBe('');
    });

    it('should not insert space before question mark', () => {
      expect(normalizeSpacing('Hello', '?')).toBe('');
    });

    it('should not insert space before semicolon', () => {
      expect(normalizeSpacing('Hello', ';')).toBe('');
    });

    it('should not insert space before colon', () => {
      expect(normalizeSpacing('Hello', ':')).toBe('');
    });

    it('should not insert space before punctuation with following text', () => {
      expect(normalizeSpacing('Hello', ', world')).toBe('');
      expect(normalizeSpacing('Hello', '. World')).toBe('');
    });
  });

  describe('empty previous text', () => {
    it('should not insert space when prev is empty', () => {
      expect(normalizeSpacing('', 'Hello')).toBe('');
    });

    it('should not insert space when prev is empty even with punctuation', () => {
      expect(normalizeSpacing('', ',')).toBe('');
    });
  });

  describe('newline handling', () => {
    it('should not insert space when prev ends with newline', () => {
      expect(normalizeSpacing('Hello\n', 'World')).toBe('');
    });

    it('should not insert space when prev ends with newline and next is punctuation', () => {
      expect(normalizeSpacing('Hello\n', ',')).toBe('');
    });

    it('should not insert space when prev is just newline', () => {
      expect(normalizeSpacing('\n', 'Hello')).toBe('');
    });

    it('should not insert space when prev ends with multiple newlines', () => {
      expect(normalizeSpacing('Hello\n\n', 'World')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle single character prev', () => {
      expect(normalizeSpacing('a', 'b')).toBe(' ');
      expect(normalizeSpacing('a', ',')).toBe('');
    });

    it('should handle numbers', () => {
      expect(normalizeSpacing('123', '456')).toBe(' ');
      expect(normalizeSpacing('123', ',')).toBe('');
    });

    it('should handle whitespace in next', () => {
      expect(normalizeSpacing('Hello', ' world')).toBe(' ');
    });

    it('should handle prev ending with space', () => {
      expect(normalizeSpacing('Hello ', 'world')).toBe(' ');
    });
  });

  describe('combined scenarios', () => {
    it('should handle multi-word prev', () => {
      expect(normalizeSpacing('Hello there', 'friend')).toBe(' ');
      expect(normalizeSpacing('Hello there', ',')).toBe('');
    });

    it('should handle sentence ending', () => {
      expect(normalizeSpacing('This is a sentence.', 'Next sentence')).toBe(' ');
    });

    it('should handle mixed punctuation', () => {
      expect(normalizeSpacing('Really?', 'Yes!')).toBe(' ');
    });
  });
});
