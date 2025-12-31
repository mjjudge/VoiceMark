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
          } else if (action === 'set') {
            chain.setBold().run();
          } else {
            chain.unsetBold().run();
          }
          break;
        case 'italic':
          if (action === 'toggle') {
            chain.toggleItalic().run();
          } else if (action === 'set') {
            chain.setItalic().run();
          } else {
            chain.unsetItalic().run();
          }
          break;
        case 'underline':
          if (action === 'toggle') {
            chain.toggleUnderline().run();
          } else if (action === 'set') {
            chain.setUnderline().run();
          } else {
            chain.unsetUnderline().run();
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
      // Delete backwards to the previous word boundary
      editor.commands.deleteRange({
        from: editor.state.selection.from,
        to: editor.state.selection.from,
      });
      // TipTap doesn't have a built-in "delete last word" command,
      // so we implement it by selecting backwards to word start and deleting
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          // Find the start of the current word by moving backwards
          let pos = from;
          const text = state.doc.textBetween(0, from);
          // Match word boundaries (spaces, punctuation, start of line)
          const match = text.match(/\S+\s*$/);
          if (match) {
            pos = from - match[0].length;
          }
          tr.delete(pos, from);
          return true;
        })
        .run();
      break;

    case 'undo':
      editor.chain().focus().undo().run();
      break;

    case 'redo':
      editor.chain().focus().redo().run();
      break;
  }
}
