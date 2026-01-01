/**
 * Types for voice command parsing.
 */

import type { EditorOp } from '../editor/ops';

/**
 * Context for parsing voice commands.
 */
export interface ParseContext {
  /**
   * Locale for command parsing (e.g., 'en-GB', 'en-US').
   * Default: 'en-GB'
   */
  locale?: string;
}

/**
 * Result of parsing a voice command.
 */
export type CommandParse =
  | { kind: 'op'; op: EditorOp }
  | { kind: 'confirm'; op: EditorOp }
  | { kind: 'insert'; text: string };
