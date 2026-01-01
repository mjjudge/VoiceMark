import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import TranscriptPanel from './components/TranscriptPanel';
import Editor from './components/Editor';
import Footer from './components/Footer';
import { voiceCommandToEditorOp } from './voice/voiceCommandToEditorOp';
import { parseTranscriptToOps } from './voice/parseTranscriptToOps';
import { applyFinalToEditor } from './asr/applyFinalToEditor';
import type { EditorOp } from './editor/ops';
import * as simulatedAsr from './asr/simulatedAsr';
import type { AsrEvent } from './asr/events';
import './styles/global.css';

// Configuration for voice command parsing in dev mode
const DEV_COMMAND_CONFIG = {
  locale: 'en-GB' as const,
  prefixes: ['voicemark', 'voice mark']
};

// Voice config for ASR routing (using en-GB defaults)
const VOICE_CONFIG = {
  locale: 'en-GB' as const,
  prefixes: ['voicemark', 'voice mark']
};

interface PendingConfirm {
  prompt: string;
  ops: EditorOp[];
  sourceText: string;
  ts: number;
}

const App: React.FC = () => {
  const [dispatch, setDispatch] = useState<((op: EditorOp) => void) | null>(null);
  const [commandInput, setCommandInput] = useState('');
  
  // ASR state management
  const [isRecording, setIsRecording] = useState(false);
  const [asrStatus, setAsrStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [partialText, setPartialText] = useState('');
  const [finalSegments, setFinalSegments] = useState<string[]>([]);
  
  // Auto-apply final ASR text to editor (default: ON)
  const [autoApplyFinal, setAutoApplyFinal] = useState(true);
  
  // Confirmation state for destructive commands
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [lastFinalRoutedTs, setLastFinalRoutedTs] = useState<number | null>(null);

  // Wrapper to handle the dispatch function from Editor
  const handleEditorReady = (dispatchFn: (op: EditorOp) => void) => {
    setDispatch(() => dispatchFn);
  };

  // Cleanup on unmount: stop ASR to clear timers
  useEffect(() => {
    return () => {
      simulatedAsr.stop();
    };
  }, []);

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

  // ASR event handler
  const handleAsrEvent = useCallback((event: AsrEvent) => {
    switch (event.type) {
      case 'asr:status':
        setAsrStatus(event.state);
        break;
      case 'asr:partial':
        setPartialText(event.text);
        break;
      case 'asr:final': {
        // Prevent double-processing of the same final event
        if (lastFinalRoutedTs === event.ts) {
          return;
        }
        setLastFinalRoutedTs(event.ts);
        
        // Append to final segments for display
        setFinalSegments(prev => [...prev, event.text]);
        setPartialText('');
        
        // Apply to editor if auto-apply is enabled
        if (autoApplyFinal) {
          const result = applyFinalToEditor(event.text, dispatch, VOICE_CONFIG);
          
          // Log warning for confirm cases
          if (result.kind === 'confirm' && result.confirmWarning) {
            console.warn(result.confirmWarning);
          }
        }
        break;
      }
      case 'asr:error':
        console.error('ASR Error:', event.message);
        break;
    }
  }, [dispatch, lastFinalRoutedTs, autoApplyFinal]);

  // Start recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    simulatedAsr.start(handleAsrEvent);
  }, [handleAsrEvent]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    simulatedAsr.stop();
  }, []);

  // Commit transcript to editor
  const handleCommitTranscript = useCallback(() => {
    if (!dispatch) return;

    // Collect all segments including any non-empty partial text
    const segments = [...finalSegments];
    if (partialText.trim()) {
      segments.push(partialText);
    }

    // Join all segments with newlines to create the full transcript
    const fullTranscript = segments.join('\n');
    
    // Parse the transcript into editor operations
    if (fullTranscript) {
      const ops = parseTranscriptToOps(fullTranscript, VOICE_CONFIG);
      
      // Execute each operation
      ops.forEach(op => dispatch(op));
      
      // Add a final paragraph break after all operations
      dispatch({ type: 'insertNewParagraph' });
    }
    
    // Clear both final segments and partial text
    setFinalSegments([]);
    setPartialText('');
  }, [dispatch, finalSegments, partialText]);

  // Clear transcript
  const handleClearTranscript = useCallback(() => {
    setFinalSegments([]);
    setPartialText('');
  }, []);

  // Handle confirmation acceptance
  const handleConfirmAccept = useCallback(() => {
    if (!dispatch || !pendingConfirm) return;
    
    // Execute the pending operations
    pendingConfirm.ops.forEach(op => dispatch(op));
    
    // Clear pending state
    setPendingConfirm(null);
  }, [dispatch, pendingConfirm]);

  // Handle confirmation rejection
  const handleConfirmReject = useCallback(() => {
    // Just clear the pending state
    setPendingConfirm(null);
  }, []);

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
      <TranscriptPanel 
        status={asrStatus}
        partialText={partialText}
        finalSegments={finalSegments}
        onCommit={handleCommitTranscript}
        onClear={handleClearTranscript}
        canCommit={!!dispatch && (finalSegments.length > 0 || partialText.trim().length > 0)}
        pendingConfirm={pendingConfirm}
        onConfirmAccept={handleConfirmAccept}
        onConfirmReject={handleConfirmReject}
      />
      <Editor onReady={handleEditorReady} />
      <Footer 
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        autoApplyFinal={autoApplyFinal}
        onAutoApplyFinalChange={setAutoApplyFinal}
      />
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
