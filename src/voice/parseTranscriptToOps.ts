/**
 * Parse committed transcript text into discrete editor commands.
 * 
 * This module converts raw transcript text into a linear list of EditorOp commands
 * by splitting the input into chunks based on newline characters and sentence
 * terminators (`.`, `?`, `!`), then parsing each chunk through voiceCommandToEditorOp.
 * 
 * Handling of `kind: 'confirm'` during commit:
 * Since user prompts are not appropriate during automatic commit processing,
 * confirm-type commands are logged to console and treated as insertText operations
 * (inserting the original text that triggered the command).
 */

import type { EditorOp } from '../editor/ops';
import type { ParseContext } from './types';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';

/**
 * Split transcript text into chunks based on newlines and sentence terminators.
 * 
 * The function splits on:
 * - Newline characters (`\n`)
 * - Sentence terminators: `.`, `?`, `!`
 * 
 * The terminators are preserved in the output chunks.
 * 
 * @param text - The transcript text to split
 * @returns Array of text chunks
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentChunk += char;
    
    // Check if this is a sentence terminator or newline
    if (char === '.' || char === '?' || char === '!' || char === '\n') {
      // Push the current chunk and start a new one
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = '';
    }
  }
  
  // Add any remaining text as the final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Parse committed transcript text into a list of editor operations.
 * 
 * The transcript is split into chunks by newlines and sentence terminators,
 * and each chunk is parsed using voiceCommandToEditorOp. The results are
 * combined into a flat list of EditorOp commands.
 * 
 * Handling by result kind:
 * - `kind: 'ops'`: Parsed operations are appended to the result list
 * - `kind: 'insert'`: An insertText operation is appended to the result list
 * - `kind: 'confirm'`: Logged to console and treated as insertText with the
 *   original chunk text (no user prompting during commit)
 * 
 * @param transcript - The committed transcript text to parse
 * @param context - Optional parsing context (locale, prefixes, etc.)
 * @returns Array of EditorOp commands to execute
 */
export function parseTranscriptToOps(
  transcript: string,
  context?: ParseContext
): EditorOp[] {
  // Handle empty transcript
  if (!transcript.trim()) {
    return [];
  }
  
  const chunks = splitIntoChunks(transcript);
  const ops: EditorOp[] = [];
  
  for (const chunk of chunks) {
    // Try parsing the chunk first
    const parsed = voiceCommandToEditorOp(chunk, context);
    
    // Special handling: if we got empty ops and chunk ends with terminator,
    // try parsing without the terminator to see if it's a valid command
    if (parsed.kind === 'ops' && parsed.ops.length === 0 && /[.?!]$/.test(chunk)) {
      const withoutTerminator = chunk.slice(0, -1).trim();
      const terminator = chunk.slice(-1);
      
      if (withoutTerminator) {
        const reparsed = voiceCommandToEditorOp(withoutTerminator, context);
        
        // If reparsing as a command worked, use those ops and add back the terminator
        if (reparsed.kind === 'ops' && reparsed.ops.length > 0) {
          ops.push(...reparsed.ops);
          ops.push({ type: 'insertText', text: terminator });
          continue;
        }
      }
    }
    
    // Use the original parse result
    if (parsed.kind === 'ops') {
      // Append all parsed operations
      // If ops is empty, it means unrecognized command - treat as plain text
      if (parsed.ops.length > 0) {
        ops.push(...parsed.ops);
      } else {
        // Unrecognized command - insert as plain text
        ops.push({ type: 'insertText', text: chunk });
      }
    } else if (parsed.kind === 'insert') {
      // Append insertText operation
      ops.push({ type: 'insertText', text: parsed.text });
    } else if (parsed.kind === 'confirm') {
      // Log to console and treat as insertText
      console.log(
        `[parseTranscriptToOps] Confirm-type command encountered during commit: "${chunk}"`,
        `Prompt would be: "${parsed.prompt}". Treating as plain text.`
      );
      ops.push({ type: 'insertText', text: chunk });
    }
  }
  
  return ops;
}
