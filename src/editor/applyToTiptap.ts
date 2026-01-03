/**
 * Apply editor operations to TipTap editor instance.
 * This module translates abstract EditorOps into concrete TipTap commands.
 */

import type { Editor } from '@tiptap/react';
import type { EditorOp } from './ops';

/**
 * Apply an editor operation to a TipTap editor.
 * @param editor - The TipTap editor instance
 * @param op - The operation to apply
 */
export function applyEditorOp(editor: Editor | null, op: EditorOp): void {
  if (!editor) {
    return;
  }

  switch (op.type) {
    case 'format': {
      const { style, action } = op;
      const chain = editor.chain().focus();

      switch (style) {
        case 'bold':
          if (action === 'toggle') {
            chain.toggleBold().run();
          } else if (action === 'make') {
            if (!editor.isActive('bold')) {
              chain.toggleBold().run();
            }
          } else {
            if (editor.isActive('bold')) {
              chain.toggleBold().run();
            }
          }
          break;
        case 'italic':
          if (action === 'toggle') {
            chain.toggleItalic().run();
          } else if (action === 'make') {
            if (!editor.isActive('italic')) {
              chain.toggleItalic().run();
            }
          } else {
            if (editor.isActive('italic')) {
              chain.toggleItalic().run();
            }
          }
          break;
        case 'underline':
          if (action === 'toggle') {
            chain.toggleUnderline().run();
          } else if (action === 'make') {
            if (!editor.isActive('underline')) {
              chain.toggleUnderline().run();
            }
          } else {
            if (editor.isActive('underline')) {
              chain.toggleUnderline().run();
            }
          }
          break;
      }
      break;
    }

    case 'insertText':
      editor.chain().focus().insertContent(op.text).run();
      break;

    case 'insertNewLine':
      editor.chain().focus().setHardBreak().run();
      break;

    case 'insertNewParagraph':
      editor.chain().focus().splitBlock().run();
      break;

    case 'deleteLastWord':
      // If there's a selection, delete it; otherwise delete the last word
      if (!editor.state.selection.empty) {
        editor.chain().focus().deleteSelection().run();
      } else {
        editor
          .chain()
          .focus()
          .command(({ tr, state }) => {
            const { from } = state.selection;
            const text = state.doc.textBetween(0, from);
            const match = text.match(/\S+\s*$/);
            if (match) {
              const pos = from - match[0].length;
              tr.delete(pos, from);
            }
            return true;
          })
          .run();
      }
      break;

    case 'deleteLastSentence': {
      // If there's a selection, delete it and return early
      if (!editor.state.selection.empty) {
        editor.chain().focus().deleteSelection().run();
        break;
      }

      // Delete the incomplete sentence (text after the last terminator)
      // This is "scratch that" behavior - delete what was just dictated
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          
          // Step 1: Find the last sentence terminator before cursor
          let lastTerminatorPos = -1;
          for (let pos = from - 1; pos >= 0; pos--) {
            try {
              const $pos = state.doc.resolve(pos);
              if ($pos.parent.isTextblock) {
                const offset = $pos.parentOffset;
                if (offset > 0) {
                  const ch = $pos.parent.textContent[offset - 1];
                  if (ch === '.' || ch === '!' || ch === '?') {
                    lastTerminatorPos = pos;
                    break;
                  }
                }
              }
            } catch {
              continue;
            }
          }
          
          // Step 2: Determine delete start position
          let deleteFrom: number;
          if (lastTerminatorPos === -1) {
            // No terminator found, delete from document start
            deleteFrom = 0;
          } else {
            // Start after the last terminator
            deleteFrom = lastTerminatorPos;
            
            // Skip whitespace after the terminator
            while (deleteFrom < from) {
              try {
                const $pos = state.doc.resolve(deleteFrom);
                if ($pos.parent.isTextblock) {
                  const offset = $pos.parentOffset;
                  const text = $pos.parent.textContent;
                  if (offset < text.length) {
                    const ch = text[offset];
                    if (ch === ' ' || ch === '\t') {
                      deleteFrom++;
                      continue;
                    }
                  }
                }
              } catch {
                break;
              }
              break;
            }
          }
          
          // Safety clamp
          const safeDeleteFrom = Math.max(0, Math.min(deleteFrom, from));
          
          if (safeDeleteFrom < from) {
            tr.delete(safeDeleteFrom, from);
          }
          
          return true;
        })
        .run();
      break;
    }
    
    case 'undo':
      editor.chain().focus().undo().run();
      break;

    case 'redo':
      editor.chain().focus().redo().run();
      break;
  }
}
