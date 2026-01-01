/**
 * Voice command to editor operation parser.
 * Translates voice commands into structured editor operations.
 */

import type { FormatStyle, FormatAction } from '../editor/ops';
import type { ParseContext, CommandParse } from './types';

/**
 * Parse a voice command and return the corresponding editor operation.
 * 
 * Commands must begin with the prefix "VoiceMark" or "Voice Mark" (case-insensitive).
 * Default locale is en-GB, with support for en-US alias "period" for "full stop".
 * 
 * @param input - The voice command text
 * @param context - Optional parsing context (locale, etc.)
 * @returns A CommandParse result indicating the operation or text to insert
 */
export function voiceCommandToEditorOp(
  input: string,
  context?: ParseContext
): CommandParse {
  const locale = context?.locale || 'en-GB';
  
  // Normalize input: lowercase and trim
  let normalized = input.toLowerCase().trim();
  
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Handle en-US alias: "period" -> "full stop"
  if (locale === 'en-US') {
    normalized = normalized.replace(/\bperiod\b/g, 'full stop');
  }
  
  // Check for command prefix: "voicemark" or "voice mark"
  const prefixes = ['voicemark ', 'voice mark '];
  let commandText: string | null = null;
  
  for (const prefix of prefixes) {
    if (normalized.indexOf(prefix) === 0) {
      commandText = normalized.substring(prefix.length).trim();
      break;
    }
  }
  
  // If no prefix found, treat as regular text insertion
  if (commandText === null) {
    return { kind: 'insert', text: input };
  }
  
  // Parse the command
  const parsed = parseCommand(commandText);
  return parsed;
}

/**
 * Parse the command text (after prefix has been stripped).
 */
function parseCommand(command: string): CommandParse {
  // Format commands: make/unmake/toggle bold/italic/underline
  const formatMatch = command.match(/^(make|unmake|toggle)\s+(bold|italic|underline)$/);
  if (formatMatch) {
    const action = formatMatch[1] as FormatAction;
    const style = formatMatch[2] as FormatStyle;
    return {
      kind: 'op',
      op: { type: 'format', style, action }
    };
  }
  
  // Delete commands
  if (command === 'delete last word') {
    return {
      kind: 'op',
      op: { type: 'deleteLastWord' }
    };
  }
  
  if (command === 'delete last sentence') {
    return {
      kind: 'confirm',
      op: { type: 'deleteLastSentence' }
    };
  }
  
  // Punctuation commands
  const punctuationMap: Record<string, string> = {
    'comma': ',',
    'full stop': '.',
    'question mark': '?',
    'exclamation mark': '!',
    'colon': ':',
    'semicolon': ';',
    'dash': '—'
  };
  
  if (command in punctuationMap) {
    return {
      kind: 'op',
      op: { type: 'insertText', text: punctuationMap[command] }
    };
  }
  
  // Newline commands
  if (command === 'new line') {
    return {
      kind: 'op',
      op: { type: 'insertNewLine' }
    };
  }
  
  if (command === 'new paragraph') {
    return {
      kind: 'op',
      op: { type: 'insertNewParagraph' }
    };
  }
  
  // Unrecognized command - treat as text to insert
  return {
    kind: 'insert',
    text: `voicemark ${command}`
  };
}
