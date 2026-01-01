/**
 * Helper function to apply finalized ASR text to the editor.
 * Encapsulates the logic for routing ASR text through voice command parsing.
 */

import { voiceCommandToEditorOp } from '../voice/voiceCommandToEditorOp';
import type { EditorOp } from '../editor/ops';
import type { ParseContext } from '../voice/types';

export interface ApplyResult {
  kind: 'insert' | 'ops' | 'confirm' | 'no-dispatch';
  operationsDispatched: number;
  confirmWarning?: string;
}

/**
 * Apply finalized ASR text to the editor via the voice command parser.
 * 
 * @param text - The finalized ASR text to process
 * @param dispatch - The editor dispatch function (or null if editor not ready)
 * @param context - Optional parsing context (locale, prefixes, etc.)
 * @returns Metadata about what was applied
 */
export function applyFinalToEditor(
  text: string,
  dispatch: ((op: EditorOp) => void) | null,
  context?: ParseContext
): ApplyResult {
  // If no dispatch function, editor is not ready
  if (!dispatch) {
    return { kind: 'no-dispatch', operationsDispatched: 0 };
  }

  // Parse the text through voice command parser
  const parsed = voiceCommandToEditorOp(text, context);

  if (parsed.kind === 'insert') {
    // Insert text with trailing space
    dispatch({ type: 'insertText', text: parsed.text + ' ' });
    return { kind: 'insert', operationsDispatched: 1 };
  } else if (parsed.kind === 'ops') {
    // Execute operations sequentially
    parsed.ops.forEach(op => dispatch(op));
    return { kind: 'ops', operationsDispatched: parsed.ops.length };
  } else if (parsed.kind === 'confirm') {
    // For confirm case: insert raw text (safety measure, matches transcript commit)
    dispatch({ type: 'insertText', text });
    return {
      kind: 'confirm',
      operationsDispatched: 1,
      confirmWarning: `Confirm case skipped for safety: "${parsed.prompt}". Raw text inserted instead.`
    };
  }

  // This should never happen given the CommandParse type
  return { kind: 'no-dispatch', operationsDispatched: 0 };
}
