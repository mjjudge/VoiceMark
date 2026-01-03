import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import TranscriptPanel from './components/TranscriptPanel';
import Editor from './components/Editor';
import Footer from './components/Footer';
import { parseTranscriptToOps } from './voice/parseTranscriptToOps';
import { parseInlineVoiceMark } from './voice/parseInlineVoiceMark';
import { parseMixedDictationToOps } from './voice/parseMixedDictation';
import { normalizeSpacing } from './asr/textBuffer';
import { initTranscriber } from './asr/transcription';
import type { EditorOp } from './editor/ops';
import type { AsrEvent, AsrEngine } from './asr/events';
import { simulatedAsrEngine } from './asr/simulatedAsr';
import { recordingAsrEngine } from './asr/recordingAsr';
import './styles/global.css';

/**
 * ASR Engine Selection
 * 
 * Use environment variable VITE_ASR_MODE to select the ASR engine:
 * - 'real' (default): Uses real microphone recording
 * - 'simulated': Uses simulated ASR with fake transcription for testing
 * 
 * To use simulated mode for testing without a microphone:
 *   VITE_ASR_MODE=simulated pnpm dev
 * 
 * Or add to .env.local:
 *   VITE_ASR_MODE=simulated
 */
const ASR_MODE = import.meta.env.VITE_ASR_MODE || 'real';
console.log('[VoiceMark] ASR_MODE:', ASR_MODE, '| env value:', import.meta.env.VITE_ASR_MODE);
const asrEngine: AsrEngine = ASR_MODE === 'simulated' ? simulatedAsrEngine : recordingAsrEngine;
console.log('[VoiceMark] Using engine:', ASR_MODE === 'simulated' ? 'simulatedAsrEngine' : 'recordingAsrEngine');

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
  
  // Selected microphone device
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  // Confirmation state for destructive commands
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [lastFinalRoutedTs, setLastFinalRoutedTs] = useState<number | null>(null);
  
  // Track last applied text for spacing normalization
  const lastAppliedRef = useRef<string>('');

  // Wrapper to handle the dispatch function from Editor
  const handleEditorReady = (dispatchFn: (op: EditorOp) => void) => {
    setDispatch(() => dispatchFn);
  };

  // Initialize transcriber on mount (silently - logs to console)
  useEffect(() => {
    initTranscriber().then((ready) => {
      console.log('[VoiceMark] Transcriber initialized, sidecar ready:', ready);
    });
  }, []);

  // Cleanup on unmount: stop ASR to clear timers
  useEffect(() => {
    return () => {
      asrEngine.stop();
    };
  }, []);

  const handleRunCommand = () => {
    if (!dispatch || !commandInput.trim()) return;

    const parsed = parseMixedDictationToOps(commandInput, DEV_COMMAND_CONFIG);
    
    // Show all ops in debug panel (immediate + pending)
    const allOps = [...parsed.immediateOps, ...parsed.pendingOps];
    setDebugOps(allOps);
    
    // Track whether we've handled spacing for the first text insertion
    let firstTextHandled = false;
    
    // Execute immediate ops first
    parsed.immediateOps.forEach(op => {
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
    
    // If there's a confirmation required, set up pending state
    if (parsed.confirm) {
      setPendingConfirm({
        prompt: parsed.confirm.prompt,
        ops: parsed.pendingOps,
        sourceText: parsed.confirm.sourceText,
        ts: Date.now()
      });
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
    // Note: recordingAsrEngine.start() is async but we don't need to await
    // Error handling is done via the asr:error event
    asrEngine.start(handleAsrEvent, { 
      deviceId: selectedDeviceId || undefined 
    });
  }, [handleAsrEvent, selectedDeviceId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    asrEngine.stop();
  }, []);

  // Commit transcript to editor
  const handleCommitTranscript = useCallback(() => {
    if (!dispatch) return;

    // If auto-apply is enabled, content is already in the editor.
    // We only need to handle any remaining partial text and clear the transcript panel.
    if (autoApplyFinal) {
      // Only insert partial text if there's any (unlikely, but handle it)
      if (partialText.trim()) {
        const ops = parseInlineVoiceMark(partialText, DEV_COMMAND_CONFIG);
        ops.forEach(op => {
          dispatch(op);
          if (op.type === 'insertText') {
            lastAppliedRef.current = op.text;
          } else if (op.type === 'insertNewLine' || op.type === 'insertNewParagraph') {
            lastAppliedRef.current = '\n';
          }
        });
      }
      
      // Clear the transcript panel display
      setFinalSegments([]);
      setPartialText('');
      return;
    }

    // Auto-apply is OFF: insert all finalSegments that haven't been applied yet
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
  }, [dispatch, finalSegments, partialText, autoApplyFinal]);

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
        asrMode={ASR_MODE as 'simulated' | 'real'}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={setSelectedDeviceId}
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
