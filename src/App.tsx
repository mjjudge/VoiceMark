import React, { useState } from 'react';
import Header from './components/Header';
import TranscriptPanel from './components/TranscriptPanel';
import Editor from './components/Editor';
import Footer from './components/Footer';
import { voiceCommandToEditorOp } from './voice/voiceCommandToEditorOp';
import type { EditorOp } from './editor/ops';
import './styles/global.css';

// Configuration for voice command parsing in dev mode
const DEV_COMMAND_CONFIG = {
  locale: 'en-GB' as const,
  prefixes: ['voicemark', 'voice mark']
};

const App: React.FC = () => {
  const [dispatch, setDispatch] = useState<((op: EditorOp) => void) | null>(null);
  const [commandInput, setCommandInput] = useState('');

  // Wrapper to handle the dispatch function from Editor
  const handleEditorReady = (dispatchFn: (op: EditorOp) => void) => {
    setDispatch(() => dispatchFn);
  };

  const handleRunCommand = () => {
    if (!dispatch || !commandInput.trim()) return;

    const result = voiceCommandToEditorOp(commandInput, DEV_COMMAND_CONFIG);

    if (result.kind === 'insert') {
      dispatch({ type: 'insertText', text: result.text });
    } else if (result.kind === 'ops') {
      result.ops.forEach(op => dispatch(op));
    } else if (result.kind === 'confirm') {
      if (window.confirm(result.prompt)) {
        result.ops.forEach(op => dispatch(op));
      }
    }
  };

  return (
    <div style={styles.app}>
      <Header />
      {import.meta.env.DEV && (
        <div style={styles.devPanel}>
          <div style={styles.devLabel}>Dev Command Runner</div>
          <div style={styles.devControls}>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRunCommand();
                }
              }}
              placeholder="Enter voice command..."
              style={styles.devInput}
            />
            <button
              type="button"
              onClick={handleRunCommand}
              disabled={!dispatch}
              style={{
                ...styles.devButton,
                ...(dispatch ? {} : styles.devButtonDisabled),
              }}
            >
              Run
            </button>
          </div>
        </div>
      )}
      <TranscriptPanel />
      <Editor onReady={handleEditorReady} />
      <Footer />
    </div>
  );
};

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    width: '100%',
  } as React.CSSProperties,
  devPanel: {
    padding: '12px 20px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #3e3e42',
  } as React.CSSProperties,
  devLabel: {
    fontSize: '11px',
    color: '#858585',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  devControls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  } as React.CSSProperties,
  devInput: {
    flex: 1,
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  devButton: {
    padding: '6px 16px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  devButtonDisabled: {
    backgroundColor: '#3c3c3c',
    color: '#858585',
    cursor: 'not-allowed',
  } as React.CSSProperties,
};

export default App;
