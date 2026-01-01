/**
 * Text buffer utilities for managing spacing between dictated segments.
 * Provides logic to normalize spacing when applying finalized ASR text.
 */

/**
 * Check if a string starts with punctuation that should not have a leading space.
 * Covers common punctuation marks: , . ! ? ; :
 * 
 * @param text - The text to check
 * @returns True if text starts with punctuation that shouldn't have a leading space
 */
export function shouldInsertSpaceBefore(text: string): boolean {
  if (!text) return false;
  
  // Check if first character is punctuation that should attach to previous word
  const firstChar = text[0];
  const nospaceBeforePunctuation = [',', '.', '!', '?', ';', ':'];
  
  return !nospaceBeforePunctuation.includes(firstChar);
}

/**
 * Normalize spacing between two text segments.
 * Returns the spacing to insert before the `next` segment.
 * 
 * Logic:
 * - Return empty string ('') if:
 *   - prev is empty
 *   - prev ends with a newline
 *   - next starts with punctuation (,.!?;:)
 * - Otherwise return a single space (' ')
 * 
 * @param prev - The previous text segment (what was last inserted)
 * @param next - The next text segment to be inserted
 * @returns The spacing string to insert before next (either '' or ' ')
 * 
 * @example
 * normalizeSpacing('Hello', 'world') // returns ' '
 * normalizeSpacing('Hello', ',') // returns ''
 * normalizeSpacing('Hello.', 'World') // returns ' '
 * normalizeSpacing('', 'Hello') // returns ''
 * normalizeSpacing('Hello\n', 'World') // returns ''
 */
export function normalizeSpacing(prev: string, next: string): string {
  // No space if prev is empty (start of document)
  if (!prev) {
    return '';
  }
  
  // No space if prev ends with newline
  if (prev.endsWith('\n')) {
    return '';
  }
  
  // No space if next starts with punctuation
  if (!shouldInsertSpaceBefore(next)) {
    return '';
  }
  
  // Default: insert a single space
  return ' ';
}
