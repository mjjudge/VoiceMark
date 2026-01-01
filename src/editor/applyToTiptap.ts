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
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          const $from = state.selection.$from;

          // Constrain to the current parent block (paragraph)
          const blockStart = $from.start(); // position at start of current block's content

          const charBefore = (pos: number) =>
            state.doc.textBetween(pos - 1, pos, '\n', '\n');

          const charAt = (pos: number) =>
            state.doc.textBetween(pos, pos + 1, '\n', '\n');

          const isWs = (ch: string) => ch === ' ' || ch === '\n' || ch === '\t';

          // Step 1: move left from cursor skipping whitespace
          let p = from;
          while (p > blockStart) {
            const ch = charBefore(p);
            if (ch === '') {
              p -= 1;
              continue;
            }
            if (!isWs(ch)) break;
            p -= 1;
          }

          // Step 2: find sentence terminator for the last sentence (. ! ?)
          let endPunctPos = -1; // position *after* punctuation
          let i = p;
          while (i > blockStart) {
            const ch = charBefore(i);
            if (ch === '') {
              i -= 1;
              continue;
            }
            if (ch === '.' || ch === '!' || ch === '?') {
              endPunctPos = i;
              break;
            }
            i -= 1;
          }

          // If there's no terminator, fall back: delete from block start to cursor
          if (endPunctPos === -1) {
            tr.delete(blockStart, from);
            return true;
          }

          // Step 3: find previous terminator to locate the start of the last sentence
          let startPos = blockStart;
          i = endPunctPos - 1;
          while (i > blockStart) {
            const ch = charBefore(i);
            if (ch === '') {
              i -= 1;
              continue;
            }
            if (ch === '.' || ch === '!' || ch === '?') {
              startPos = i; // position after previous punctuation
              break;
            }
            i -= 1;
          }

          // Step 4: move startPos forward over whitespace
          while (startPos < from) {
            const ch = charAt(startPos);
            if (ch === '') {
              startPos += 1;
              continue;
            }
            if (!isWs(ch)) break;
            startPos += 1;
          }

          tr.delete(startPos, from);
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
