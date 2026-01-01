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
 * @param context - Optional parsing context (locale, prefixes, etc.)
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
  
  // Use custom prefixes or default to ['voicemark', 'voice mark']
  const prefixes = context?.prefixes || ['voicemark', 'voice mark'];
  let commandText: string | null = null;
  
  // Check for command prefix - accept exact match or prefix + space
  for (const prefix of prefixes) {
    if (normalized === prefix) {
      // Exact prefix match with no command - return no-op
      return { kind: 'ops', ops: [] };
    }
    if (normalized.startsWith(prefix + ' ')) {
      commandText = normalized.substring(prefix.length + 1).trim();
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
  // Support aliases: italics -> italic, underlined -> underline
  const formatMatch = command.match(/^(make|unmake|toggle)\s+(bold|italic|italics|underline|underlined)$/);
  if (formatMatch) {
    const action = formatMatch[1] as FormatAction;
    let style = formatMatch[2];
    
    // Handle aliases
    if (style === 'italics') style = 'italic';
    if (style === 'underlined') style = 'underline';
    
    return {
      kind: 'ops',
      ops: [{ type: 'format', style: style as FormatStyle, action }],
      confidence: 'high'
    };
  }
  
  // Delete commands
  if (command === 'delete last word') {
    return {
      kind: 'ops',
      ops: [{ type: 'deleteLastWord' }],
      confidence: 'high'
    };
  }
  
  if (command === 'delete last sentence') {
    return {
      kind: 'confirm',
      ops: [{ type: 'deleteLastSentence' }],
      prompt: 'Delete the last sentence?'
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
    'dash': '-'
  };
  
  if (command in punctuationMap) {
    return {
      kind: 'ops',
      ops: [{ type: 'insertText', text: punctuationMap[command] }],
      confidence: 'high'
    };
  }
  
  // Newline commands
  if (command === 'new line') {
    return {
      kind: 'ops',
      ops: [{ type: 'insertNewLine' }],
      confidence: 'high'
    };
  }
  
  if (command === 'new paragraph') {
    return {
      kind: 'ops',
      ops: [{ type: 'insertNewParagraph' }],
      confidence: 'high'
    };
  }
  
  // Unrecognized command - return empty ops with medium confidence
  // (do not insert 'voicemark ...' as text)
  return {
    kind: 'ops',
    ops: [],
    confidence: 'medium'
  };
}
