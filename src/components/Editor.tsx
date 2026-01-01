import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { applyEditorOp } from '../editor/applyToTiptap';
import type { EditorOp } from '../editor/ops';

// Function to export content as Markdown with HTML support for underline
function exportMarkdown(html: string): string {
  if (!html) return '';
  
  // Convert HTML to Markdown-like format
  // We preserve <u> tags for underline as per requirements
  let markdown = html
    // Convert <br> tags to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove wrapping <p> tags but keep line breaks
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    // Convert bold - use global flag to handle multiple occurrences
    .replace(/<strong>/g, '**')
    .replace(/<\/strong>/g, '**')
    // Convert italic
    .replace(/<em>/g, '*')
    .replace(/<\/em>/g, '*');
    // Preserve <u> tags as HTML for underline formatting (as required)

  // Collapse 3 or more sequential newlines into a maximum of 2
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Trim to avoid trailing newlines
  markdown = markdown.trim();

  return markdown;
}

interface EditorProps {
  onReady?: (dispatch: (op: EditorOp) => void) => void;
}

const Editor: React.FC<EditorProps> = ({ onReady }) => {
  const [showDebug, setShowDebug] = useState(false);
  const [markdownOutput, setMarkdownOutput] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      // Update markdown output only when debug panel is visible
      if (showDebug) {
        setMarkdownOutput(exportMarkdown(updatedEditor.getHTML()));
      }
    },
  });

  // Initialize markdown output when editor is ready or debug panel is shown
  useEffect(() => {
    if (editor && showDebug) {
      setMarkdownOutput(exportMarkdown(editor.getHTML()));
    }
  }, [editor, showDebug]);

  // Dispatch function to apply editor operations
  const dispatch = useCallback((op: EditorOp) => {
    applyEditorOp(editor, op);
  }, [editor]);

  // Notify parent when dispatch is ready
  useEffect(() => {
    if (editor && onReady) {
      onReady(dispatch);
    }
  }, [editor, dispatch, onReady]);

  const toggleBold = () => {
    dispatch({ type: 'format', style: 'bold', action: 'toggle' });
  };

  const toggleItalic = () => {
    dispatch({ type: 'format', style: 'italic', action: 'toggle' });
  };

  const toggleUnderline = () => {
    dispatch({ type: 'format', style: 'underline', action: 'toggle' });
  };

  return (
    <div style={styles.container}>
      {/* Formatting Toolbar */}
      <div style={styles.toolbar}>
        <button
          type="button"
          onClick={toggleBold}
          style={{
            ...styles.toolbarButton,
            ...(editor?.isActive('bold') ? styles.toolbarButtonActive : {}),
          }}
          title="Bold (Ctrl/Cmd+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          style={{
            ...styles.toolbarButton,
            ...(editor?.isActive('italic') ? styles.toolbarButtonActive : {}),
          }}
          title="Italic (Ctrl/Cmd+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          style={{
            ...styles.toolbarButton,
            ...(editor?.isActive('underline') ? styles.toolbarButtonActive : {}),
          }}
          title="Underline (Ctrl/Cmd+U)"
        >
          <u>U</u>
        </button>
      </div>

      {/* Editor */}
      <div style={styles.editorWrapper}>
        <EditorContent editor={editor} />
      </div>

      {/* Debug Panel */}
      <div style={styles.debugPanel}>
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          style={styles.debugToggle}
        >
          {showDebug ? '▼' : '▶'} Debug: Markdown output (approx)
        </button>
        {showDebug && (
          <pre style={styles.debugContent}>
            {markdownOutput || '(empty)'}
          </pre>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
  } as React.CSSProperties,
  toolbar: {
    display: 'flex',
    gap: '4px',
    padding: '8px 20px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
  } as React.CSSProperties,
  toolbarButton: {
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '36px',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  toolbarButtonActive: {
    backgroundColor: '#094771',
    borderColor: '#007acc',
  } as React.CSSProperties,
  editorWrapper: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
  } as React.CSSProperties,
  debugPanel: {
    borderTop: '1px solid #3e3e42',
    backgroundColor: '#252526',
  } as React.CSSProperties,
  debugToggle: {
    width: '100%',
    padding: '8px 20px',
    textAlign: 'left' as const,
    backgroundColor: 'transparent',
    color: '#d4d4d4',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  debugContent: {
    padding: '12px 20px',
    margin: 0,
    color: '#858585',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    maxHeight: '200px',
    overflow: 'auto',
  } as React.CSSProperties,
};

export default Editor;
