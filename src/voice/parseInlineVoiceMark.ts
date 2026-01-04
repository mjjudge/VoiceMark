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
 * - Filters out Whisper artifacts like [BLANK_AUDIO]
 * - Strips trailing punctuation before punctuation commands to avoid doubling
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext } from './types';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

/**
 * Common Whisper transcription errors mapped to correct commands.
 * Whisper often mishears these command words.
 */
const FUZZY_COMMAND_MAP: Record<string, string> = {
  // exclamation mark variants (Whisper often mishears this)
  'escalimation mark': 'exclamation mark',
  'esclamation mark': 'exclamation mark',
  'esklimation mark': 'exclamation mark',
  'esklamation mark': 'exclamation mark',
  'excalmation mark': 'exclamation mark',
  'exclaimation mark': 'exclamation mark',
  'explanation mark': 'exclamation mark',
  'exclimation mark': 'exclamation mark',
  'exclemation mark': 'exclamation mark',
  // question mark variants
  'questioning mark': 'question mark',
  // full stop variants  
  'fullstop': 'full stop',
  'full-stop': 'full stop',
  // new paragraph variants
  'new paragraf': 'new paragraph',
  'new paragragh': 'new paragraph',
  // comma variants
  'coma': 'comma',
};

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
 * Pattern to match Whisper artifacts like [BLANK_AUDIO], [MUSIC], [NOISE], [ Silence ], etc.
 * These should be filtered out of the transcript.
 * Handles optional spaces inside brackets.
 */
const WHISPER_ARTIFACT_PATTERN = /\[\s*[\w_]+\s*\]/gi;

/**
 * Strip Whisper artifacts from text.
 * Removes patterns like [BLANK_AUDIO], [MUSIC], [NOISE], etc.
 * Preserves all other spacing in the text.
 */
function stripWhisperArtifacts(text: string): string {
  // Remove artifacts only, preserve all other spacing
  return text.replace(WHISPER_ARTIFACT_PATTERN, '').trim();
}

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
/**
 * Check if a command produces punctuation (text that shouldn't have space before it).
 */
function isPunctuationCommand(commandPhrase: string): boolean {
  const punctuationCommands = [
    'comma', 'full stop', 'period', 'question mark', 
    'exclamation mark', 'colon', 'semicolon', 'dash',
  ];
  return punctuationCommands.includes(commandPhrase.toLowerCase());
}

/**
 * Check if a command produces a newline.
 */
function isNewlineCommand(commandPhrase: string): boolean {
  const newlineCommands = ['new line', 'new paragraph'];
  return newlineCommands.includes(commandPhrase.toLowerCase());
}

export function parseInlineVoiceMark(
  text: string,
  context: ParseContext
): EditorOp[] {
  // First, strip Whisper artifacts like [BLANK_AUDIO]
  const cleanedText = stripWhisperArtifacts(text);
  if (!cleanedText) {
    return [];
  }
  
  const ops: EditorOp[] = [];
  const prefixes = context.prefixes || ['voicemark', 'voice mark'];
  
  let currentPos = 0;
  // Track what the previous operation was to handle spacing correctly
  let prevOpType: 'none' | 'text' | 'punctuation' | 'newline' | 'command' = 'none';
  
  while (currentPos < cleanedText.length) {
    // Find the next command prefix
    const result = findNextPrefix(cleanedText, currentPos, prefixes);
    
    if (result === null) {
      // No more commands found - insert remaining text
      const remaining = cleanedText.substring(currentPos);
      // Strip leading punctuation that Whisper may have added after the last command
      // e.g., "Voice Mark new paragraph." → the trailing "." should be stripped
      const stripped = remaining.replace(/^[.?!,;:\s]+/, '');
      const trimmed = stripped.trim();
      if (trimmed) {
        // Add leading space if previous op was punctuation or command (not newline, not first)
        const needsSpace = prevOpType === 'punctuation' || prevOpType === 'command';
        ops.push({ type: 'insertText', text: needsSpace ? ' ' + trimmed : trimmed });
      }
      break;
    }
    
    const { prefixStart, prefixEnd, prefix } = result;
    
    // Insert any text before the command
    if (prefixStart > currentPos) {
      let beforeText = cleanedText.substring(currentPos, prefixStart).trim();
      // Strip leading punctuation that Whisper may have added after a previous command
      // e.g., "Voice Mark comma. Hello" → the leading "." before "Hello" should be stripped
      beforeText = beforeText.replace(/^[.?!,;:\s]+/, '');
      if (beforeText) {
        // Add leading space if previous op was punctuation or command (not newline, not first)
        const needsSpace = prevOpType === 'punctuation' || prevOpType === 'command';
        ops.push({ type: 'insertText', text: needsSpace ? ' ' + beforeText : beforeText });
        prevOpType = 'text';
      }
    }
    
    // Try to parse a command starting from prefixEnd
    const commandResult = parseCommandPhrase(cleanedText, prefixEnd, SUPPORTED_COMMANDS);
    
    if (commandResult !== null) {
      // If this is a punctuation command, strip trailing punctuation from the previous text op
      // This handles cases where Whisper adds "." and then user says "voicemark full stop"
      // Only strip from text that has actual word content (not from command-inserted punctuation)
      if (isPunctuationCommand(commandResult.commandPhrase) && ops.length > 0 && prevOpType === 'text') {
        const lastOp = ops[ops.length - 1];
        if (lastOp.type === 'insertText' && lastOp.text) {
          // Only strip if the text contains word characters (not just punctuation)
          if (/\w/.test(lastOp.text)) {
            // Strip trailing punctuation (.?!,;:) from the previous text
            const strippedText = lastOp.text.replace(/[.?!,;:]+\s*$/, '');
            if (strippedText !== lastOp.text) {
              if (strippedText.trim()) {
                ops[ops.length - 1] = { type: 'insertText', text: strippedText };
              } else {
                // If nothing left after stripping, remove the op entirely
                ops.pop();
              }
            }
          }
        }
      }
      
      // Found a supported command - reconstruct full command and parse it
      const fullCommand = prefix + ' ' + commandResult.commandPhrase;
      const parsed = voiceCommandToEditorOp(fullCommand, context);
      
      if (parsed.kind === 'ops') {
        ops.push(...parsed.ops);
        // Track what type of command this was
        if (isPunctuationCommand(commandResult.commandPhrase)) {
          prevOpType = 'punctuation';
        } else if (isNewlineCommand(commandResult.commandPhrase)) {
          prevOpType = 'newline';
        } else {
          prevOpType = 'command';
        }
      } else if (parsed.kind === 'insert') {
        // Should not happen since we have the prefix, but handle gracefully
        ops.push({ type: 'insertText', text: parsed.text });
        prevOpType = 'text';
      } else if (parsed.kind === 'confirm') {
        // For inline ASR parsing, execute confirm-kind commands immediately
        // (confirmation flow is only for Dev Command Runner with UI)
        // The user said the command aloud, so they clearly want it executed
        ops.push(...parsed.ops);
        prevOpType = 'command';
      }
      
      // Move position past this command
      currentPos = commandResult.endPos;
    } else {
      // No supported command found after prefix - treat prefix as normal text
      const needsSpace = prevOpType === 'punctuation' || prevOpType === 'command';
      ops.push({ type: 'insertText', text: needsSpace ? ' ' + prefix + ' ' : prefix + ' ' });
      currentPos = prefixEnd;
      prevOpType = 'text';
    }
  }
  
  return ops;
}

/**
 * Check if a character represents a word boundary.
 * Includes whitespace AND common punctuation (to handle Whisper artifacts like "Voice Mark, comma")
 */
function isWordBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s,;:.!?-]/.test(char);
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
 * Also supports fuzzy matching for common Whisper transcription errors.
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
  
  // Skip punctuation that Whisper might insert after "Voice Mark" (e.g., comma, colon)
  // This handles cases like "Voice Mark, question mark" → "question mark"
  while (pos < text.length && /[,;:.-]/.test(text[pos])) {
    pos++;
    // Skip any whitespace after the punctuation
    while (pos < text.length && /\s/.test(text[pos])) {
      pos++;
    }
  }
  
  if (pos >= text.length) {
    return null;
  }
  
  const textLower = text.toLowerCase();
  
  // First, try exact matches with supported commands
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
      const afterChar = endPos < text.length ? text[endPos] : undefined;
      
      if (isWordBoundary(afterChar) || endPos === text.length) {
        // Found a match
        return {
          commandPhrase: command, // Use the normalized command phrase
          endPos: endPos
        };
      }
    }
  }
  
  // If no exact match, try fuzzy matching for known Whisper transcription errors
  // Build all fuzzy patterns sorted by length (longest first)
  const fuzzyPatterns = Object.keys(FUZZY_COMMAND_MAP).sort((a, b) => b.length - a.length);
  
  for (const fuzzyPattern of fuzzyPatterns) {
    const patternLower = fuzzyPattern.toLowerCase();
    const endPos = pos + patternLower.length;
    
    if (endPos > text.length) {
      continue;
    }
    
    const textSlice = textLower.substring(pos, endPos);
    if (textSlice === patternLower) {
      // Check if this is followed by a word boundary
      const afterChar = endPos < text.length ? text[endPos] : undefined;
      
      if (isWordBoundary(afterChar) || endPos === text.length) {
        // Found a fuzzy match - return the corrected command
        return {
          commandPhrase: FUZZY_COMMAND_MAP[fuzzyPattern],
          endPos: endPos
        };
      }
    }
  }
  
  return null;
}
