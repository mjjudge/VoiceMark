/**
 * Parse committed transcript text into editor operations.
 * 
 * This function converts transcript text into a linear list of EditorOp commands
 * by splitting the text into chunks and parsing each chunk through parseInlineVoiceMark.
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext } from './types';
import { parseInlineVoiceMark } from './parseInlineVoiceMark';

/**
 * Default parsing context for parseTranscriptToOps
 */
const DEFAULT_PARSE_CONTEXT: ParseContext = {
  prefixes: ['voicemark', 'voice mark']
};

/**
 * Parse transcript text into a list of editor operations.
 * 
 * The transcript is split into chunks based on:
 * - Newline characters (\n)
 * - Sentence terminators: . ? !
 * 
 * Each chunk is parsed using parseInlineVoiceMark to support multiple inline commands.
 * 
 * @param transcript - The committed transcript text to parse
 * @param context - Optional parsing context (locale, prefixes, etc.)
 * @returns Array of EditorOp commands to execute
 */
export function parseTranscriptToOps(
  transcript: string,
  context?: ParseContext
): EditorOp[] {
  if (!transcript.trim()) {
    return [];
  }

  const ops: EditorOp[] = [];
  
  // Split by newlines and sentence terminators, keeping the delimiters
  const chunks = splitIntoChunks(transcript);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const nextChunk = i + 1 < chunks.length ? chunks[i + 1] : null;
    
    // Special handling for newlines - always output them
    if (chunk === '\n') {
      ops.push({ type: 'insertText', text: '\n' });
      continue;
    }
    
    // Skip empty or whitespace-only chunks (except newlines)
    if (!chunk.trim()) {
      continue;
    }
    
    const trimmedChunk = chunk.trim();
    
    // Parse the chunk for inline commands using parseInlineVoiceMark
    const chunkOps = parseInlineVoiceMark(trimmedChunk, context || DEFAULT_PARSE_CONTEXT);
    
    // If no operations were generated and the chunk is not empty, insert as text
    if (chunkOps.length === 0 && trimmedChunk) {
      ops.push({ type: 'insertText', text: trimmedChunk });
    } else {
      ops.push(...chunkOps);
    }
    
    // Add space after terminators to separate from following text
    if (shouldInsertSpaceAfter(trimmedChunk, nextChunk)) {
      ops.push({ type: 'insertText', text: ' ' });
    }
  }
  
  return ops;
}

/**
 * Check if a chunk is a sentence terminator.
 * 
 * @param chunk - The chunk to check
 * @returns True if the chunk is a terminator (. ? !)
 */
function isTerminator(chunk: string): boolean {
  return chunk === '.' || chunk === '?' || chunk === '!';
}

/**
 * Determine if a space should be inserted after the current chunk.
 * 
 * Spaces are added after terminators to prevent text from merging,
 * but not before newlines or other terminators.
 * 
 * @param currentChunk - The current chunk (trimmed)
 * @param nextChunk - The next chunk (may be untrimmed), or null if none
 * @returns True if a space should be inserted
 */
function shouldInsertSpaceAfter(currentChunk: string, nextChunk: string | null): boolean {
  // Only insert space after terminators
  if (!isTerminator(currentChunk)) {
    return false;
  }
  
  // Don't insert space if there's no next chunk
  if (!nextChunk) {
    return false;
  }
  
  // Don't insert space before newlines
  if (nextChunk === '\n') {
    return false;
  }
  
  // Don't insert space before another terminator
  if (isTerminator(nextChunk)) {
    return false;
  }
  
  return true;
}

/**
 * Split transcript into chunks based on newlines and sentence terminators.
 * Sentence terminators (. ? !) are kept as separate chunks.
 * 
 * @param text - The text to split
 * @returns Array of text chunks
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  
  // Split by newlines first
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Split each line by sentence terminators
    const parts = splitBySentenceTerminators(line);
    chunks.push(...parts);
    
    // Add newline marker between lines (except after the last line)
    if (i < lines.length - 1) {
      chunks.push('\n');
    }
  }
  
  return chunks;
}

/**
 * Split text by sentence terminators (. ? !), keeping the terminators as separate chunks.
 * 
 * @param text - The text to split
 * @returns Array of text parts
 */
function splitBySentenceTerminators(text: string): string[] {
  if (!text) {
    return [];
  }
  
  const parts: string[] = [];
  let current = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '.' || char === '?' || char === '!') {
      // Add the text before the terminator if any
      if (current.trim()) {
        parts.push(current.trim());
      }
      // Add the terminator as a separate chunk
      parts.push(char);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add any remaining text
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts;
}
