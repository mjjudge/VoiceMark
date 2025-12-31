import React, { useCallback } from 'react';
import { useEditor } from 'some-editor-package';
import './styles.css';

const Editor = () => {

  // Function to export markdown
  const exportMarkdown = useCallback((htmlContent) => {
    if (!htmlContent) return '';

    // Replace <br> tags with newlines and preserve <u> tags
    let markdown = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<u>(.*?)<\/u>/gi, '__$1__')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n');

    // Remove trailing newlines from the final </p>
    markdown = markdown.replace(/\n$/, '');

    // Collapse consecutive newlines to a maximum of two
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown;
  }, []);

  const { onUpdate, content } = useEditor({
    onUpdate: (htmlContent) => {
      const markdownOutput = exportMarkdown(htmlContent);
      console.debug('Debug: Markdown output (approx)', markdownOutput); // Updated debug label
    },
  });

  return (
    <div className="editor-container">
      <div className="editor" ref={onUpdate} />
      <button>Export Markdown</button>
      <div className="debug-panel">
        <h4>Debug: Markdown output (approx)</h4> {/* Updated debug label */}
        <pre>{content}</pre>
      </div>
    </div>
  );
};

export default Editor;