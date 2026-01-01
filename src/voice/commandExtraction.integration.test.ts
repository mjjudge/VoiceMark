/**
 * Integration tests for VoiceMark command extraction in ASR final text handling.
 * Tests the complete flow from ASR text to editor operations.
 */

import { describe, it, expect } from 'vitest';
import { extractVoiceMarkCommand } from './extractVoiceMarkCommand';
import { voiceCommandToEditorOp } from './voiceCommandToEditorOp';
import type { EditorOp } from '../editor/ops';

describe('VoiceMark command extraction integration', () => {
  const prefixes = ['voicemark', 'voice mark'];

  describe('test cases from requirements', () => {
    it('should handle "Hello VoiceMark comma" - insert text then comma', () => {
      // Simulate the flow in App.tsx
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'Hello VoiceMark comma';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      // Step 1: Insert the "before" segment with trailing space
      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      // Step 2: Process the command
      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        } else if (result.kind === 'insert') {
          dispatch({ type: 'insertText', text: result.text });
        }
      }

      // Verify: should have two operations
      expect(dispatchedOps).toHaveLength(2);
      
      // First: insert "Hello " with trailing space
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'Hello '
      });
      
      // Second: insert comma
      expect(dispatchedOps[1]).toEqual({
        type: 'insertText',
        text: ','
      });
    });

    it('should handle "Hello voice mark new paragraph" - insert text then new paragraph', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'Hello voice mark new paragraph';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      // Step 1: Insert the "before" segment with trailing space
      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      // Step 2: Process the command
      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        } else if (result.kind === 'insert') {
          dispatch({ type: 'insertText', text: result.text });
        }
      }

      // Verify: should have two operations
      expect(dispatchedOps).toHaveLength(2);
      
      // First: insert "Hello " with trailing space
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'Hello '
      });
      
      // Second: insert new paragraph
      expect(dispatchedOps[1]).toEqual({
        type: 'insertNewParagraph'
      });
    });

    it('should handle "No prefix here" - insert entire text as is', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'No prefix here';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      // Step 1: Insert the "before" segment with trailing space
      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      // Step 2: Process the command (should be null)
      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        } else if (result.kind === 'insert') {
          dispatch({ type: 'insertText', text: result.text });
        }
      }

      // Verify: should have one operation
      expect(dispatchedOps).toHaveLength(1);
      
      // Should insert the entire text with trailing space
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'No prefix here '
      });
    });
  });

  describe('additional integration scenarios', () => {
    it('should handle command at the start with no before text', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'voicemark full stop';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        }
      }

      // Should have only one operation (the period)
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: '.'
      });
    });

    it('should handle formatting commands in combination with text', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'Important word voicemark make bold';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        }
      }

      expect(dispatchedOps).toHaveLength(2);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'Important word '
      });
      expect(dispatchedOps[1]).toEqual({
        type: 'format',
        style: 'bold',
        action: 'make'
      });
    });

    it('should handle confirm case - insert command as text for safety', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'Some text voicemark delete last sentence';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        } else if (result.kind === 'confirm') {
          // Safety measure: insert the command as text
          dispatch({ type: 'insertText', text: extracted.command });
        }
      }

      expect(dispatchedOps).toHaveLength(2);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'Some text '
      });
      expect(dispatchedOps[1]).toEqual({
        type: 'insertText',
        text: 'voicemark delete last sentence'
      });
    });

    it('should handle unrecognized command - insert before text only', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'Test voicemark unknown command here';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        }
      }

      // Should only have the before text, command returns empty ops
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'Test '
      });
    });

    it('should handle multiple words before command', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = (op: EditorOp) => dispatchedOps.push(op);

      const text = 'This is a longer sentence voice mark question mark';
      const extracted = extractVoiceMarkCommand(text, prefixes);

      if (extracted.before) {
        dispatch({ type: 'insertText', text: extracted.before + ' ' });
      }

      if (extracted.command) {
        const result = voiceCommandToEditorOp(extracted.command);
        if (result.kind === 'ops') {
          result.ops.forEach(op => dispatch(op));
        }
      }

      expect(dispatchedOps).toHaveLength(2);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'This is a longer sentence '
      });
      expect(dispatchedOps[1]).toEqual({
        type: 'insertText',
        text: '?'
      });
    });
  });
});
