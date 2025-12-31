import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const MAX_CONVERSION_ITERATIONS = 10; // Prevent infinite loops when processing nested tags

const Editor: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: '<p>Start typing here...</p>',
    editorProps: {
      attributes: {
        style: 'outline: none; padding: 16px; min-height: 300px;',
      },
    },
  });

  const getMarkdown = () => {
    if (!editor) return '';
    
    // Get HTML content
    const html = editor.getHTML();
    
    // Process HTML to Markdown with better handling of nested tags
    let result = html;
    
    // Handle paragraphs
    result = result.replace(/<p><\/p>/g, '\n\n');
    result = result.replace(/<p>/g, '');
    result = result.replace(/<\/p>/g, '\n\n');
    
    // Handle line breaks
    result = result.replace(/<br\s*\/?>/g, '\n');
    
    // Handle formatting - process iteratively to handle nested tags
    // Keep processing until no more changes occur
    let iteration = 0;
    let previousResult = '';
    
    while (result !== previousResult && iteration < MAX_CONVERSION_ITERATIONS) {
      previousResult = result;
      // Process bold tags
      result = result.replace(/<strong>(.*?)<\/strong>/gs, (match, content) => {
        // If content has no more strong tags, convert it
        if (!content.includes('<strong>')) {
          return '**' + content + '**';
        }
        return match;
      });
      // Process italic tags
      result = result.replace(/<em>(.*?)<\/em>/gs, (match, content) => {
        // If content has no more em tags, convert it
        if (!content.includes('<em>')) {
          return '*' + content + '*';
        }
        return match;
      });
      // Keep underline as HTML
      result = result.replace(/<u>(.*?)<\/u>/gs, (match, content) => {
        if (!content.includes('<u>')) {
          return '<u>' + content + '</u>';
        }
        return match;
      });
      iteration++;
    }
    
    return result.trim();
  };

  if (!editor) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Formatting Toolbar */}
      <div style={styles.toolbar}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{
            ...styles.toolbarButton,
            ...(editor.isActive('bold') ? styles.activeButton : {}),
          }}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{
            ...styles.toolbarButton,
            ...(editor.isActive('italic') ? styles.activeButton : {}),
          }}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={{
            ...styles.toolbarButton,
            ...(editor.isActive('underline') ? styles.activeButton : {}),
          }}
          title="Underline (Ctrl+U)"
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
          {showDebug ? '▼' : '▶'} Debug: Markdown Output
        </button>
        {showDebug && (
          <pre style={styles.debugContent}>
            {getMarkdown()}
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
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
  } as React.CSSProperties,
  toolbarButton: {
    padding: '8px 16px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  } as React.CSSProperties,
  activeButton: {
    backgroundColor: '#0e639c',
    borderColor: '#1177bb',
  } as React.CSSProperties,
  editorWrapper: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
  } as React.CSSProperties,
  debugPanel: {
    backgroundColor: '#252526',
    borderTop: '1px solid #3e3e42',
  } as React.CSSProperties,
  debugToggle: {
    width: '100%',
    padding: '12px 20px',
    backgroundColor: '#252526',
    color: '#d4d4d4',
    border: 'none',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  } as React.CSSProperties,
  debugContent: {
    padding: '20px',
    margin: 0,
    backgroundColor: '#1e1e1e',
    color: '#4ec9b0',
    fontSize: '13px',
    fontFamily: 'monospace',
    maxHeight: '200px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,
};

export default Editor;
