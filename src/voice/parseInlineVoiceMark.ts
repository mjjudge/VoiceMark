/**
 * Parse multiple inline VoiceMark commands from a single ASR final string.
 * 
 * This module enables parsing of text containing multiple embedded VoiceMark commands,
 * such as "My name is Marcus voicemark comma what's your name voicemark new paragraph".
 * 
 * The parser:
 * - Scans for command prefixes ("voicemark", "voice mark") as whole words, case-insensitive
 * - Inserts any plain text before each command (trimmed right, but preserving internal spaces)
 * - Parses each command and emits corresponding operations
 * - Continues scanning after each command until the text is exhausted
 * - Handles unsupported commands by treating them as normal text
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext } from './types';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

/**
 * Supported command phrases for v0.1
 */
const SUPPORTED_COMMANDS = [
  // Punctuation
  'comma',
  'full stop',
  'period',  // en-US alias for full stop
  'question mark',
  'exclamation mark',
  'colon',
  'semicolon',
  'dash',
  
  // Newlines
  'new line',
  'new paragraph',
  
  // Deletion
  'delete last word',
  'delete last sentence',
  
  // Formatting (all combinations)
  'make bold',
  'make italic',
  'make italics',
  'make underline',
  'make underlined',
  'unmake bold',
  'unmake italic',
  'unmake italics',
  'unmake underline',
  'unmake underlined',
  'toggle bold',
  'toggle italic',
  'toggle italics',
  'toggle underline',
  'toggle underlined',
];

/**
 * Parse text containing multiple inline VoiceMark commands.
 * 
 * @param text - The ASR final text to parse
 * @param context - Parsing context (locale, prefixes, etc.)
 * @returns Array of EditorOp operations to execute
 * 
 * @example
 * parseInlineVoiceMark("Hello voicemark comma world", { prefixes: ['voicemark'] })
 * // Returns: [{ type: 'insertText', text: 'Hello ' }, { type: 'insertText', text: ',' }, { type: 'insertText', text: ' world' }]
 */
export function parseInlineVoiceMark(
  text: string,
  context: ParseContext
): EditorOp[] {
  const ops: EditorOp[] = [];
  const prefixes = context.prefixes || ['voicemark', 'voice mark'];
  
  let currentPos = 0;
  
  while (currentPos < text.length) {
    // Find the next command prefix
    const result = findNextPrefix(text, currentPos, prefixes);
    
    if (result === null) {
      // No more commands found - insert remaining text
      const remaining = text.substring(currentPos);
      const trimmed = remaining.trimEnd();
      if (trimmed) {
        ops.push({ type: 'insertText', text: trimmed });
      }
      break;
    }
    
    const { prefixStart, prefixEnd, prefix } = result;
    
    // Insert any text before the command (trim right)
    if (prefixStart > currentPos) {
      const beforeText = text.substring(currentPos, prefixStart).trimEnd();
      if (beforeText) {
        ops.push({ type: 'insertText', text: beforeText + ' ' });
      }
    }
    
    // Try to parse a command starting from prefixEnd
    const commandResult = parseCommandPhrase(text, prefixEnd, SUPPORTED_COMMANDS);
    
    if (commandResult !== null) {
      // Found a supported command - reconstruct full command and parse it
      const fullCommand = prefix + ' ' + commandResult.commandPhrase;
      const parsed = voiceCommandToEditorOp(fullCommand, context);
      
      if (parsed.kind === 'ops') {
        ops.push(...parsed.ops);
      } else if (parsed.kind === 'insert') {
        // Should not happen since we have the prefix, but handle gracefully
        ops.push({ type: 'insertText', text: parsed.text });
      } else if (parsed.kind === 'confirm') {
        // Treat confirm-kind as insert of the original text chunk
        // Per requirement: "Any confirm-kind parsed inline should be treated as an insert of the original chunk"
        ops.push({ type: 'insertText', text: commandResult.commandPhrase });
      }
      
      // Move position past this command
      currentPos = commandResult.endPos;
    } else {
      // No supported command found after prefix - treat prefix as normal text
      ops.push({ type: 'insertText', text: prefix + ' ' });
      currentPos = prefixEnd;
    }
  }
  
  return ops;
}

/**
 * Check if a character represents a word boundary.
 */
function isWordBoundary(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

/**
 * Find the next occurrence of a command prefix in the text.
 * Uses whole-word matching (case-insensitive).
 * 
 * @param text - The text to search
 * @param startPos - Position to start searching from
 * @param prefixes - Array of prefix strings to search for
 * @returns Object with prefix position and matched prefix, or null if not found
 */
function findNextPrefix(
  text: string,
  startPos: number,
  prefixes: string[]
): { prefixStart: number; prefixEnd: number; prefix: string } | null {
  const textLower = text.toLowerCase();
  let closestMatch: { prefixStart: number; prefixEnd: number; prefix: string } | null = null;
  
  for (const prefix of prefixes) {
    const prefixLower = prefix.toLowerCase();
    
    // Search from startPos
    let searchPos = startPos;
    while (searchPos < text.length) {
      const idx = textLower.indexOf(prefixLower, searchPos);
      if (idx === -1) break;
      
      // Check if this is a whole-word match
      const beforeIdx = idx > 0 ? text[idx - 1] : undefined;
      const afterIdx = idx + prefixLower.length < text.length 
        ? text[idx + prefixLower.length] 
        : undefined;
      
      const isWordBoundaryBefore = isWordBoundary(beforeIdx) || idx === 0;
      const isWordBoundaryAfter = isWordBoundary(afterIdx) || idx + prefixLower.length === text.length;
      
      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        // Found a valid match
        const matchStart = idx;
        const matchEnd = idx + prefixLower.length;
        const matchedPrefix = text.substring(matchStart, matchEnd);
        
        // Keep the closest match (smallest index)
        if (closestMatch === null || matchStart < closestMatch.prefixStart) {
          closestMatch = {
            prefixStart: matchStart,
            prefixEnd: matchEnd,
            prefix: matchedPrefix
          };
        }
        break;
      }
      
      // Not a valid match, continue searching
      searchPos = idx + 1;
    }
  }
  
  return closestMatch;
}

/**
 * Try to parse a command phrase starting from the given position.
 * Matches against the list of supported commands.
 * 
 * @param text - The text to parse
 * @param startPos - Position to start parsing from (after the prefix)
 * @param supportedCommands - List of supported command phrases
 * @returns Object with command phrase and end position, or null if no match
 */
function parseCommandPhrase(
  text: string,
  startPos: number,
  supportedCommands: string[]
): { commandPhrase: string; endPos: number } | null {
  // Skip leading whitespace
  let pos = startPos;
  while (pos < text.length && /\s/.test(text[pos])) {
    pos++;
  }
  
  if (pos >= text.length) {
    return null;
  }
  
  const textLower = text.toLowerCase();
  
  // Try to match each supported command
  // Sort by length (longest first) to prefer longer matches
  const sortedCommands = [...supportedCommands].sort((a, b) => b.length - a.length);
  
  for (const command of sortedCommands) {
    const commandLower = command.toLowerCase();
    const endPos = pos + commandLower.length;
    
    if (endPos > text.length) {
      continue;
    }
    
    const textSlice = textLower.substring(pos, endPos);
    if (textSlice === commandLower) {
      // Check if this is followed by a word boundary
      const afterChar = endPos < text.length ? text[endPos] : ' ';
      const isWordBoundaryAfter = /\s/.test(afterChar) || endPos === text.length;
      
      if (isWordBoundaryAfter) {
        // Found a match
        return {
          commandPhrase: command, // Use the normalized command phrase
          endPos: endPos
        };
      }
    }
  }
  
  return null;
}
