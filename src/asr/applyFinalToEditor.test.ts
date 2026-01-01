/**
 * Tests for applyFinalToEditor helper function.
 */

import { describe, it, expect, vi } from 'vitest';
import { applyFinalToEditor } from './applyFinalToEditor';
import type { EditorOp } from '../editor/ops';

describe('applyFinalToEditor', () => {
  describe('insert scenario', () => {
    it('should dispatch insertText with trailing space for plain text', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('hello world', dispatch);

      expect(result.kind).toBe('insert');
      expect(result.operationsDispatched).toBe(1);
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'hello world '
      });
    });

    it('should add space even to empty text', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('', dispatch);

      expect(result.kind).toBe('insert');
      expect(result.operationsDispatched).toBe(1);
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: ' '
      });
    });
  });

  describe('ops scenario', () => {
    it('should dispatch voice command operations sequentially', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark comma', dispatch);

      expect(result.kind).toBe('ops');
      expect(result.operationsDispatched).toBe(1);
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: ','
      });
    });

    it('should handle formatting commands', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark make bold', dispatch);

      expect(result.kind).toBe('ops');
      expect(result.operationsDispatched).toBe(1);
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'format',
        style: 'bold',
        action: 'make'
      });
    });

    it('should handle multiple operations from delete command', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark delete last word', dispatch);

      expect(result.kind).toBe('ops');
      expect(result.operationsDispatched).toBe(1);
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'deleteLastWord'
      });
    });

    it('should return zero operations for unrecognized command', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark unknown command', dispatch);

      expect(result.kind).toBe('ops');
      expect(result.operationsDispatched).toBe(0);
      expect(dispatchedOps).toHaveLength(0);
    });
  });

  describe('confirm scenario', () => {
    it('should insert raw text and return warning for destructive commands', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark delete last sentence', dispatch);

      expect(result.kind).toBe('confirm');
      expect(result.operationsDispatched).toBe(1);
      expect(result.confirmWarning).toContain('Confirm case skipped');
      expect(result.confirmWarning).toContain('Delete the last sentence?');
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: 'voicemark delete last sentence'
      });
    });

    it('should preserve original text exactly when inserting for confirm case', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const inputText = 'VOICEMARK DELETE LAST SENTENCE';
      const result = applyFinalToEditor(inputText, dispatch);

      expect(result.kind).toBe('confirm');
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: inputText
      });
    });
  });

  describe('null dispatch handling', () => {
    it('should return no-dispatch when dispatch is null', () => {
      const result = applyFinalToEditor('hello world', null);

      expect(result.kind).toBe('no-dispatch');
      expect(result.operationsDispatched).toBe(0);
      expect(result.confirmWarning).toBeUndefined();
    });

    it('should not throw when dispatch is null', () => {
      expect(() => {
        applyFinalToEditor('voicemark comma', null);
      }).not.toThrow();
    });
  });

  describe('context handling', () => {
    it('should respect custom context prefixes', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('hey assistant comma', dispatch, {
        prefixes: ['hey assistant']
      });

      expect(result.kind).toBe('ops');
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: ','
      });
    });

    it('should respect locale settings', () => {
      const dispatchedOps: EditorOp[] = [];
      const dispatch = vi.fn((op: EditorOp) => dispatchedOps.push(op));

      const result = applyFinalToEditor('voicemark period', dispatch, {
        locale: 'en-US'
      });

      expect(result.kind).toBe('ops');
      expect(dispatchedOps).toHaveLength(1);
      expect(dispatchedOps[0]).toEqual({
        type: 'insertText',
        text: '.'
      });
    });
  });
});
