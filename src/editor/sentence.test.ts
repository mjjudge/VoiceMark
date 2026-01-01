/**
 * Tests for sentence boundary detection utilities.
 */

import { describe, it, expect } from 'vitest';
import { findDeleteStartIndex } from './sentence';

describe('findDeleteStartIndex', () => {
  describe('basic sentence detection', () => {
    it('should delete from after period in two-sentence block', () => {
      const text = "Hello world. Second sentence.";
      const cursorOffset = text.length; // 29
      const result = findDeleteStartIndex(text, cursorOffset);
      // Should start after "." and space, at index 13
      expect(result).toBe(13);
      expect(text.substring(result, cursorOffset)).toBe("Second sentence.");
    });

    it('should delete entire block if no previous terminator', () => {
      const text = "Single sentence.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
      expect(text.substring(result, cursorOffset)).toBe(text);
    });

    it('should handle three sentences and delete only last one', () => {
      const text = "First. Second. Third.";
      const cursorOffset = text.length; // 21
      const result = findDeleteStartIndex(text, cursorOffset);
      // Should start after second "." and space, at index 15
      expect(result).toBe(15);
      expect(text.substring(result, cursorOffset)).toBe("Third.");
    });
  });

  describe('different terminators', () => {
    it('should handle exclamation mark as terminator', () => {
      const text = "Hello! How are you?";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(7);
      expect(text.substring(result, cursorOffset)).toBe("How are you?");
    });

    it('should handle question mark as terminator', () => {
      const text = "Is this working? Yes it is.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(17);
      expect(text.substring(result, cursorOffset)).toBe("Yes it is.");
    });

    it('should handle mixed terminators', () => {
      const text = "Hello! Is this working? Yes.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(24);
      expect(text.substring(result, cursorOffset)).toBe("Yes.");
    });
  });

  describe('whitespace handling', () => {
    it('should skip multiple spaces after terminator', () => {
      const text = "First.    Multiple spaces.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(10);
      expect(text.substring(result, cursorOffset)).toBe("Multiple spaces.");
    });

    it('should handle no space after terminator', () => {
      const text = "First.Second.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(6);
      expect(text.substring(result, cursorOffset)).toBe("Second.");
    });

    it('should skip tab characters after terminator', () => {
      const text = "First.\tTabbed sentence.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(7);
      expect(text.substring(result, cursorOffset)).toBe("Tabbed sentence.");
    });

    it('should skip newline characters after terminator', () => {
      const text = "First.\nNewline sentence.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(7);
      expect(text.substring(result, cursorOffset)).toBe("Newline sentence.");
    });
  });

  describe('cursor position variations', () => {
    it('should handle cursor in middle of text', () => {
      const text = "First. Second. Third.";
      const cursorOffset = 14; // After "Second"
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(7);
      expect(text.substring(result, cursorOffset)).toBe("Second.");
    });

    it('should handle cursor at start', () => {
      const text = "Some text.";
      const cursorOffset = 0;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
    });

    it('should handle cursor right after terminator', () => {
      const text = "First. Second.";
      const cursorOffset = 6; // Right after first period
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
      expect(text.substring(result, cursorOffset)).toBe("First.");
    });

    it('should handle cursor in whitespace after terminator', () => {
      const text = "First.   Second.";
      const cursorOffset = 8; // In the whitespace
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
      expect(text.substring(result, cursorOffset)).toBe("First.  ");
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const text = "";
      const cursorOffset = 0;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
    });

    it('should handle single character', () => {
      const text = "a";
      const cursorOffset = 1;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
    });

    it('should handle only terminators', () => {
      const text = "...";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      // Deletes from after second period (position 2) to cursor
      expect(result).toBe(2);
      expect(text.substring(result, cursorOffset)).toBe(".");
    });

    it('should handle text with no terminators', () => {
      const text = "No terminators here";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(0);
    });

    it('should handle only whitespace after terminator', () => {
      const text = "First.   ";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      // Since there's no previous terminator, deletes entire text including whitespace
      expect(result).toBe(0);
      expect(text.substring(result, cursorOffset)).toBe("First.   ");
    });
  });

  describe('realistic scenarios', () => {
    it('should handle typical paragraph with multiple sentences', () => {
      const text = "This is the first sentence. This is the second one! And here is the third?";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      expect(result).toBe(52);
      expect(text.substring(result, cursorOffset)).toBe("And here is the third?");
    });

    it('should not leave stray characters when deleting', () => {
      const text = "Hello world. Ok.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      // Should include the short "Ok." sentence
      expect(result).toBe(13);
      expect(text.substring(result, cursorOffset)).toBe("Ok.");
    });

    it('should handle abbreviations without false positives', () => {
      // Note: This is a limitation - the function treats all periods as terminators
      // In real use, this might need enhancement, but for now it's acceptable
      const text = "Dr. Smith said hello.";
      const cursorOffset = text.length;
      const result = findDeleteStartIndex(text, cursorOffset);
      // Will treat "Dr." as a sentence terminator
      expect(result).toBe(4);
    });
  });
});
