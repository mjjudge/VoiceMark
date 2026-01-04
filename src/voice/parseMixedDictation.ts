/**
 * Parse mixed dictation input containing both plain text and VoiceMark commands.
 * 
 * This module provides a parser that scans input left-to-right, identifies
 * command prefixes ("voicemark", "voice mark") case-insensitively, and splits
 * the input into chunks:
 * 
 * - Preceding non-command text → insertText op (preserves original casing)
 * - Command chunk (prefix + command words) → parsed via voiceCommandToEditorOp()
 * - Trailing text after commands → insertText op
 * 
 * Unlike parseInlineVoiceMark, this module returns a MixedDictationParse that
 * can include confirm-kind results for destructive commands.
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext, CommandParse } from './types';
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
  return text.replace(WHISPER_ARTIFACT_PATTERN, '').trim();
}

/**
 * A chunk representing either plain text or a parsed command.
 */
export type MixedChunk =
  | { kind: 'text'; text: string }
  | { kind: 'command'; parse: CommandParse; sourceText: string };

/**
 * Result of parsing mixed dictation input.
 */
export interface MixedDictationParse {
  /**
   * The parsed chunks in order.
   */
  chunks: MixedChunk[];
  
  /**
   * If any chunk requires confirmation, this contains the first such prompt
   * and the ops that would be executed (including text inserts before/after).
   */
  confirm?: {
    prompt: string;
    /** All ops to execute if confirmed (text inserts + command ops) */
    allOps: EditorOp[];
    /** The source text of the command requiring confirmation */
    sourceText: string;
  };
  
  /**
   * Ops that can be executed immediately (before any confirm-required command).
   */
  immediateOps: EditorOp[];
  
  /**
   * Ops to execute after confirmation (if any).
   */
  pendingOps: EditorOp[];
}

/**
 * Parse mixed dictation input containing both plain text and VoiceMark commands.
 * 
 * @param input - The raw dictation text to parse
 * @param ctx - Parsing context (locale, prefixes, etc.)
 * @returns MixedDictationParse with chunks, immediate ops, and any pending confirmation
 * 
 * @example
 * parseMixedDictationToOps("Hello voicemark new paragraph World", ctx)
 * // Returns chunks: text "Hello ", command new paragraph, text "World"
 * // immediateOps: [insertText "Hello ", insertNewParagraph, insertText "World"]
 */
export function parseMixedDictationToOps(
  input: string,
  ctx: ParseContext
): MixedDictationParse {
  // First, strip Whisper artifacts like [BLANK_AUDIO]
  const cleanedInput = stripWhisperArtifacts(input);
  if (!cleanedInput) {
    return { chunks: [], immediateOps: [], pendingOps: [] };
  }
  
  const prefixes = ctx.prefixes || ['voicemark', 'voice mark'];
  const chunks: MixedChunk[] = [];
  
  let currentPos = 0;
  
  while (currentPos < cleanedInput.length) {
    // Find the next command prefix
    const prefixResult = findNextPrefix(cleanedInput, currentPos, prefixes);
    
    if (prefixResult === null) {
      // No more commands found - add remaining text as a chunk
      // Strip leading punctuation that Whisper may have added after a previous command
      let remaining = cleanedInput.substring(currentPos).trim();
      remaining = remaining.replace(/^[.?!,;:\s]+/, '');
      if (remaining) {
        chunks.push({ kind: 'text', text: remaining });
      }
      break;
    }
    
    const { prefixStart, prefixEnd, prefix } = prefixResult;
    
    // Add any text before the command as a text chunk
    if (prefixStart > currentPos) {
      let beforeText = cleanedInput.substring(currentPos, prefixStart).trim();
      // Strip leading punctuation that Whisper may have added after a previous command
      beforeText = beforeText.replace(/^[.?!,;:\s]+/, '');
      if (beforeText) {
        chunks.push({ kind: 'text', text: beforeText });
      }
    }
    
    // Try to parse a command starting from prefixEnd
    const commandResult = parseCommandPhrase(cleanedInput, prefixEnd, SUPPORTED_COMMANDS);
    
    if (commandResult !== null) {
      // Found a supported command - reconstruct full command and parse it
      const fullCommand = prefix + ' ' + commandResult.commandPhrase;
      const parsed = voiceCommandToEditorOp(fullCommand, ctx);
      
      chunks.push({
        kind: 'command',
        parse: parsed,
        sourceText: fullCommand
      });
      
      // Move position past this command
      currentPos = commandResult.endPos;
    } else {
      // No supported command found after prefix - treat prefix as normal text
      chunks.push({ kind: 'text', text: prefix });
      currentPos = prefixEnd;
    }
  }
  
  // Now build the result with immediate/pending ops
  return buildParseResult(chunks);
}

/**
 * Check if an EditorOp is a punctuation insertion.
 */
function isPunctuationOp(op: EditorOp): boolean {
  if (op.type !== 'insertText') return false;
  return /^[,.?!:;-]$/.test(op.text);
}

/**
 * Check if an EditorOp is a newline/paragraph insertion.
 */
function isNewlineOp(op: EditorOp): boolean {
  return op.type === 'insertNewLine' || op.type === 'insertNewParagraph';
}

/**
 * Build the final parse result from chunks.
 * Separates immediate ops from pending (confirm-required) ops.
 * Handles spacing between chunks:
 * - Text before a command: no trailing space (command handles spacing)
 * - Text after a punctuation command: add leading space
 * - Text after a non-punctuation command: add leading space
 */
function buildParseResult(chunks: MixedChunk[]): MixedDictationParse {
  const immediateOps: EditorOp[] = [];
  const pendingOps: EditorOp[] = [];
  let confirm: MixedDictationParse['confirm'] = undefined;
  let foundConfirm = false;
  
  // Track what type of chunk came before for spacing decisions
  // 'newline' = after insertNewLine/insertNewParagraph (no space needed)
  let prevChunkType: 'none' | 'text' | 'command' | 'punctuation' | 'newline' = 'none';
  
  for (const chunk of chunks) {
    if (chunk.kind === 'text') {
      let text = chunk.text;
      
      // Add leading space if this text follows a command or punctuation
      // But NOT after a newline (new paragraph/line already provides separation)
      if (prevChunkType === 'command' || prevChunkType === 'punctuation') {
        text = ' ' + text;
      }
      
      const op: EditorOp = { type: 'insertText', text };
      if (foundConfirm) {
        pendingOps.push(op);
      } else {
        immediateOps.push(op);
      }
      
      prevChunkType = 'text';
    } else {
      // Command chunk
      const parse = chunk.parse;
      
      // Determine if this command produces punctuation
      let commandProducesPunctuation = false;
      if (parse.kind === 'ops' && parse.ops.length === 1 && isPunctuationOp(parse.ops[0])) {
        commandProducesPunctuation = true;
      }
      
      // If this is a punctuation command and previous chunk was text,
      // strip trailing punctuation from the last text op to avoid doubling
      // (e.g., Whisper adds "." AND user says "voicemark full stop")
      if (commandProducesPunctuation && prevChunkType === 'text') {
        // Get the ops array we're currently working with
        const targetOps = foundConfirm ? pendingOps : immediateOps;
        if (targetOps.length > 0) {
          const lastOp = targetOps[targetOps.length - 1];
          if (lastOp.type === 'insertText' && lastOp.text) {
            // Only strip if the text contains word characters (not just punctuation)
            if (/\w/.test(lastOp.text)) {
              // Strip trailing punctuation (.?!,;:) from the previous text
              const strippedText = lastOp.text.replace(/[.?!,;:]+\s*$/, '');
              if (strippedText !== lastOp.text) {
                if (strippedText.trim()) {
                  targetOps[targetOps.length - 1] = { type: 'insertText', text: strippedText };
                } else {
                  // If nothing left after stripping, remove the op entirely
                  targetOps.pop();
                }
              }
            }
          }
        }
      }
      
      if (parse.kind === 'confirm') {
        if (!foundConfirm) {
          // First confirm - mark the boundary
          foundConfirm = true;
          
          // Build allOps: immediate ops so far + confirm ops + pending ops (filled later)
          const allOps = [...immediateOps, ...parse.ops];
          
          confirm = {
            prompt: parse.prompt,
            allOps,
            sourceText: chunk.sourceText
          };
          
          // The confirm ops go to pending
          pendingOps.push(...parse.ops);
        } else {
          // Additional confirm after first - treat as pending
          pendingOps.push(...parse.ops);
        }
        prevChunkType = 'command';
      } else if (parse.kind === 'ops') {
        if (foundConfirm) {
          pendingOps.push(...parse.ops);
        } else {
          immediateOps.push(...parse.ops);
        }
        // Determine chunk type based on what the command produces
        if (parse.ops.length === 1 && isNewlineOp(parse.ops[0])) {
          prevChunkType = 'newline';
        } else if (commandProducesPunctuation) {
          prevChunkType = 'punctuation';
        } else {
          prevChunkType = 'command';
        }
      } else if (parse.kind === 'insert') {
        // Insert kind - add as text with spacing
        let text = parse.text;
        if (prevChunkType === 'command' || prevChunkType === 'punctuation') {
          text = ' ' + text;
        }
        const op: EditorOp = { type: 'insertText', text };
        if (foundConfirm) {
          pendingOps.push(op);
        } else {
          immediateOps.push(op);
        }
        prevChunkType = 'text';
      }
    }
  }
  
  // If we have a confirm, update allOps to include pending ops
  if (confirm) {
    confirm.allOps = [...immediateOps, ...pendingOps];
  }
  
  return {
    chunks,
    confirm,
    immediateOps,
    pendingOps
  };
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
        const matchStart = idx;
        const matchEnd = idx + prefixLower.length;
        const matchedPrefix = text.substring(matchStart, matchEnd);
        
        if (closestMatch === null || matchStart < closestMatch.prefixStart) {
          closestMatch = {
            prefixStart: matchStart,
            prefixEnd: matchEnd,
            prefix: matchedPrefix
          };
        }
        break;
      }
      
      searchPos = idx + 1;
    }
  }
  
  return closestMatch;
}

/**
 * Try to parse a command phrase starting from the given position.
 * Matches against the list of supported commands.
 * Also supports fuzzy matching for common Whisper transcription errors.
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
      const afterChar = endPos < text.length ? text[endPos] : undefined;
      
      if (isWordBoundary(afterChar) || endPos === text.length) {
        return {
          commandPhrase: command,
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
