/**
 * Sentence boundary detection utilities for editor operations.
 */

/**
 * Find the starting index for deletion when removing the last sentence.
 * 
 * This function locates the appropriate position to start deletion when
 * removing the last sentence from a text block. It handles:
 * - Detecting sentence terminators (., !, ?)
 * - Skipping whitespace after terminators
 * - Returning 0 if no terminator is found (delete from start)
 * 
 * @param blockText - The text content of the current block/paragraph
 * @param cursorOffset - The cursor position within the block (0-indexed)
 * @returns The index position where deletion should start
 * 
 * @example
 * findDeleteStartIndex("Hello world. Second sentence.", 29) // Returns 13 (after ".")
 * findDeleteStartIndex("Single sentence.", 16) // Returns 0 (no previous terminator)
 * findDeleteStartIndex("First. Second. Third.", 21) // Returns 15 (after second ".")
 */
export function findDeleteStartIndex(blockText: string, cursorOffset: number): number {
  // If cursor is at or before start, nothing to delete
  if (cursorOffset <= 0) {
    return cursorOffset;
  }

  // Step 1: Move backwards from cursor, skipping trailing whitespace
  let endPos = cursorOffset - 1;
  while (endPos >= 0) {
    const ch = blockText[endPos];
    if (ch !== ' ' && ch !== '\t' && ch !== '\n') {
      break;
    }
    endPos--;
  }

  // If we're at start or all whitespace, return 0
  if (endPos < 0) {
    return 0;
  }

  // Step 2: Find the last sentence terminator before endPos
  let lastTerminatorPos = -1;
  for (let i = endPos; i >= 0; i--) {
    const ch = blockText[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      lastTerminatorPos = i;
      break;
    }
  }

  // If no terminator found, delete from beginning
  if (lastTerminatorPos === -1) {
    return 0;
  }

  // Step 3: Find the previous terminator before lastTerminatorPos
  let prevTerminatorPos = -1;
  for (let i = lastTerminatorPos - 1; i >= 0; i--) {
    const ch = blockText[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      prevTerminatorPos = i;
      break;
    }
  }

  // Step 4: Start from after the previous terminator (or beginning)
  let deleteStart = prevTerminatorPos === -1 ? 0 : prevTerminatorPos + 1;

  // Step 5: Skip whitespace after the previous terminator
  while (deleteStart < cursorOffset) {
    const ch = blockText[deleteStart];
    if (ch !== ' ' && ch !== '\t' && ch !== '\n') {
      break;
    }
    deleteStart++;
  }

  return deleteStart;
}
