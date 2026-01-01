/**
 * Editor operation types and interfaces.
 * This abstraction layer allows operations to be dispatched without
 * directly coupling to TipTap's API, making it easier to add voice
 * command integration in the future.
 */

export type FormatStyle = 'bold' | 'italic' | 'underline';
export type FormatAction = 'toggle' | 'make' | 'unmake';

export type EditorOp =
  | { type: 'format'; style: FormatStyle; action: FormatAction }
  | { type: 'insertText'; text: string }
  | { type: 'insertNewLine' }
  | { type: 'insertNewParagraph' }
  | { type: 'deleteLastWord' }
  | { type: 'deleteLastSentence' }
  | { type: 'undo' }
  | { type: 'redo' };
