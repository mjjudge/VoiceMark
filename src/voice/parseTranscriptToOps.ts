/**
 * Parse committed transcript text into editor operations.
 * 
 * This function converts transcript text into a linear list of EditorOp commands
 * by splitting the text into chunks and parsing each chunk through voiceCommandToEditorOp.
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext } from './types';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

/**
 * Parse transcript text into a list of editor operations.
 * 
 * The transcript is split into chunks based on:
 * - Newline characters (\n)
 * - Sentence terminators: . ? !
 * 
 * Each chunk is parsed using voiceCommandToEditorOp:
 * - If kind: 'ops', the operations are appended to the result
 * - If kind: 'insert', an insertText operation is appended
 * - If kind: 'confirm', the text is logged to console and treated as insertText
 *   (confirmation prompts are not supported in commit mode)
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
  // We use a regex that captures the delimiter in a group so we can process it
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
    const parsed = voiceCommandToEditorOp(trimmedChunk, context);
    
    // Helper to check if a chunk is a sentence terminator
    const isTerminator = (c: string) => c === '.' || c === '?' || c === '!';
    
    if (parsed.kind === 'ops') {
      // If ops is empty and confidence is medium (unrecognized command),
      // don't insert anything (the command was not recognized)
      if (parsed.ops.length === 0 && parsed.confidence === 'medium') {
        // Skip unrecognized commands
        continue;
      }
      ops.push(...parsed.ops);
    } else if (parsed.kind === 'insert') {
      ops.push({ type: 'insertText', text: trimmedChunk });
    } else if (parsed.kind === 'confirm') {
      // In commit mode, we log the confirmation request and treat it as insertText
      console.log(`[parseTranscriptToOps] Confirmation skipped: "${parsed.prompt}"`);
      // Insert the original chunk text as fallback
      ops.push({ type: 'insertText', text: trimmedChunk });
    }
    
    // Add space after terminators to separate from following text
    // Don't add space if: next chunk is newline, next chunk is terminator, or no next chunk
    if (isTerminator(trimmedChunk) && nextChunk && nextChunk !== '\n' && !isTerminator(nextChunk)) {
      ops.push({ type: 'insertText', text: ' ' });
    }
  }
  
  return ops;
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
