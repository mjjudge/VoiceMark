import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const Editor: React.FC = () => {
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
      // Update markdown output when editor content changes
      setMarkdownOutput(exportMarkdown(updatedEditor.getHTML()));
    },
  });

  // Function to export content as Markdown with HTML support for underline
  const exportMarkdown = (html: string): string => {
    if (!html) return '';
    
    // Convert HTML to Markdown-like format
    // We preserve <u> tags for underline as per requirements
    // Process from outermost to innermost to handle nesting correctly
    const markdown = html
      // Remove wrapping <p> tags but keep line breaks
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n')
      // Convert bold - use global flag to handle multiple occurrences
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**')
      // Convert italic
      .replace(/<em>/g, '*')
      .replace(/<\/em>/g, '*')
      // Keep underline as HTML tags (already in correct format)
      .trim();

    return markdown;
  };

  // Initialize markdown output when editor is ready
  useEffect(() => {
    if (editor) {
      setMarkdownOutput(exportMarkdown(editor.getHTML()));
    }
  }, [editor]);

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  return (
    <div style={styles.container}>
      {/* Formatting Toolbar */}
      <div style={styles.toolbar}>
        <button
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
          onClick={() => setShowDebug(!showDebug)}
          style={styles.debugToggle}
        >
          {showDebug ? '▼' : '▶'} Debug: Markdown output
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
