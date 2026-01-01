/**
 * Types for voice command parsing.
 */

import type { EditorOp } from '../editor/ops';

/**
 * Supported voice locales.
 */
export type VoiceLocale = 'en-GB' | 'en-US';

/**
 * Context for parsing voice commands.
 */
export interface ParseContext {
  /**
   * Locale for command parsing.
   * Default: 'en-GB'
   */
  locale?: VoiceLocale;
  
  /**
   * Custom command prefixes (e.g., ['voicemark', 'voice mark']).
   * If not provided, defaults to ['voicemark', 'voice mark'].
   */
  prefixes?: string[];
  
  /**
   * Command mode: 'prefix' requires prefix to be present, 'always' treats all input as commands.
   * Default: 'prefix'
   */
  commandMode?: 'prefix' | 'always';
}

/**
 * Result of parsing a voice command.
 */
export type CommandParse =
  | { kind: 'ops'; ops: EditorOp[]; confidence?: 'high' | 'medium' }
  | { kind: 'confirm'; ops: EditorOp[]; prompt: string }
  | { kind: 'insert'; text: string };
