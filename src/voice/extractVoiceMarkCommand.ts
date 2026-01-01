/**
 * Helper function to extract VoiceMark commands from finalized ASR text.
 * Splits text into before/command/after segments when a command prefix is detected.
 */

export interface ExtractResult {
  /** Text before the command (right-trimmed) */
  before: string;
  /** The full command text (including prefix), or null if no command found */
  command: string | null;
  /** Text after the command (empty for now, as command consumes the rest) */
  after: string;
}

/**
 * Extract VoiceMark command from text.
 * Performs case-insensitive whole-word search for command prefixes.
 * 
 * @param text - The finalized ASR text to process
 * @param prefixes - Array of command prefixes (e.g., ['voicemark', 'voice mark'])
 * @returns Object with before, command, and after segments
 * 
 * @example
 * extractVoiceMarkCommand('Hello VoiceMark comma', ['voicemark', 'voice mark'])
 * // Returns: { before: 'Hello', command: 'voicemark comma', after: '' }
 * 
 * @example
 * extractVoiceMarkCommand('No prefix here', ['voicemark', 'voice mark'])
 * // Returns: { before: 'No prefix here', command: null, after: '' }
 */
export function extractVoiceMarkCommand(
  text: string,
  prefixes: string[]
): ExtractResult {
  // Normalize the text for matching: lowercase
  const normalizedText = text.toLowerCase();
  
  // Try to find a matching prefix
  for (const prefix of prefixes) {
    const normalizedPrefix = prefix.toLowerCase();
    
    // Build a regex for whole-word matching of the prefix
    // \b ensures word boundary, and we look for prefix followed by end or space
    const regex = new RegExp(`\\b${escapeRegex(normalizedPrefix)}(?:\\s|$)`, 'i');
    const match = normalizedText.match(regex);
    
    if (match && match.index !== undefined) {
      // Found a match - split the original text at this position
      const matchStart = match.index;
      
      // Extract before (everything up to the match, right-trimmed)
      const before = text.substring(0, matchStart).trimEnd();
      
      // Extract command (from match start to end of string, preserving original case)
      const command = text.substring(matchStart);
      
      // After is empty for now (command consumes everything)
      const after = '';
      
      return { before, command, after };
    }
  }
  
  // No prefix found - return entire text as 'before'
  return {
    before: text,
    command: null,
    after: ''
  };
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
