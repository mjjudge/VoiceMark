/**
 * Apply editor operations to TipTap editor instance.
 * This module translates abstract EditorOps into concrete TipTap commands.
 */

import type { Editor } from '@tiptap/react';
import type { EditorOp } from './ops';
import { findDeleteStartIndex } from './sentence';

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

      // Otherwise, delete the last sentence in the current block
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          const { $from } = state.selection;

          // Find nearest textblock depth
          let depth = $from.depth;
          while (depth > 0 && !$from.node(depth).isTextblock) {
            depth--;
          }

          const blockStart = $from.start(depth);

          // Use stable separators so offsets map predictably
          const blockText = state.doc.textBetween(blockStart, from, '\n', '\n');

          const cursorOffset = blockText.length;
          const deleteStartOffset = findDeleteStartIndex(blockText, cursorOffset);

          const deleteFrom = blockStart + deleteStartOffset;

          // Safety clamp (prevents weird ranges)
          const safeDeleteFrom = Math.max(blockStart, Math.min(deleteFrom, from));

          tr.delete(safeDeleteFrom, from);
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
