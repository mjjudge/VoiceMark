import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import TranscriptPanel from './components/TranscriptPanel';
import Editor from './components/Editor';
import Footer from './components/Footer';
import { parseTranscriptToOps } from './voice/parseTranscriptToOps';
import { parseInlineVoiceMark } from './voice/parseInlineVoiceMark';
import { normalizeSpacing } from './asr/textBuffer';
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
  const [debugOps, setDebugOps] = useState<EditorOp[]>([]);
  
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
  
  // Track last applied text for spacing normalization
  const lastAppliedRef = useRef<string>('');

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

    const ops = parseInlineVoiceMark(commandInput, DEV_COMMAND_CONFIG);
    setDebugOps(ops);
    
    ops.forEach(op => {
      // Skip confirmation for deleteLastSentence in dev runner (for testing)
      if (op.type === 'deleteLastSentence') {
        dispatch(op);
      } else {
        dispatch(op);
      }
      
      // Track what was inserted for spacing purposes
      if (op.type === 'insertText') {
        lastAppliedRef.current = op.text;
      } else if (op.type === 'insertNewLine' || op.type === 'insertNewParagraph') {
        lastAppliedRef.current = '\n';
      }
    });
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
        if (autoApplyFinal && dispatch) {
          // Parse the text for multiple inline VoiceMark commands
          const ops = parseInlineVoiceMark(event.text, DEV_COMMAND_CONFIG);
          
          // Track whether we've applied spacing to the first text insertion
          let firstTextHandled = false;
          
          // Execute operations sequentially, handling spacing for text insertions
          ops.forEach((op) => {
            if (op.type === 'insertText') {
              // Apply spacing normalization to the first text insertion only
              if (!firstTextHandled) {
                const spacing = normalizeSpacing(lastAppliedRef.current, op.text);
                const textToInsert = spacing + op.text;
                dispatch({ type: 'insertText', text: textToInsert });
                lastAppliedRef.current = textToInsert;
                firstTextHandled = true;
              } else {
                dispatch(op);
                lastAppliedRef.current = op.text;
              }
            } else {
              dispatch(op);
              // Track what was inserted for spacing purposes
              if (op.type === 'insertNewLine' || op.type === 'insertNewParagraph') {
                lastAppliedRef.current = '\n';
              }
            }
          });
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

    // If auto-apply is disabled, we need to insert any un-applied finalSegments
    // If auto-apply is enabled, finalSegments might still have content if there were issues
    // We'll insert any remaining content either way for safety
    
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
      
      // Execute each operation and track what was inserted
      ops.forEach(op => {
        dispatch(op);
        // Track what was inserted for spacing purposes
        if (op.type === 'insertText') {
          lastAppliedRef.current = op.text;
        } else if (op.type === 'insertNewLine' || op.type === 'insertNewParagraph') {
          lastAppliedRef.current = '\n';
        }
      });
      
      // Add a final paragraph break after all operations
      dispatch({ type: 'insertNewParagraph' });
      
      // Update lastAppliedRef to track the newline
      lastAppliedRef.current = '\n';
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
    
    // Execute the pending operations and track what was inserted
    pendingConfirm.ops.forEach(op => {
      dispatch(op);
      // Track what was inserted for spacing purposes
      if (op.type === 'insertText') {
        lastAppliedRef.current = op.text;
      } else if (op.type === 'insertNewLine' || op.type === 'insertNewParagraph') {
        lastAppliedRef.current = '\n';
      }
    });
    
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
          {debugOps.length > 0 && (
            <pre style={styles.devDebug}>
              {JSON.stringify(debugOps, null, 2)}
            </pre>
          )}
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
  devDebug: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#2d2d2d',
    color: '#d4d4d4',
    fontSize: '11px',
    fontFamily: 'monospace',
    borderRadius: '4px',
    border: '1px solid #3e3e42',
    overflow: 'auto',
    maxHeight: '200px',
  } as React.CSSProperties,
};

export default App;
