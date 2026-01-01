import React from 'react';

interface TranscriptPanelProps {
  status: 'idle' | 'recording' | 'processing';
  partialText: string;
  finalSegments: string[];
  onCommit: () => void;
  onClear: () => void;
  canCommit: boolean;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  status,
  partialText,
  finalSegments,
  onCommit,
  onClear,
  canCommit,
}) => {
  const statusText = status === 'idle' ? 'Idle' : status === 'recording' ? 'Recording...' : 'Processing...';
  const hasContent = finalSegments.length > 0 || partialText;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.label}>
          Live Transcript
          <span style={styles.statusBadge}>{statusText}</span>
        </div>
        <div style={styles.actions}>
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit}
            style={{
              ...styles.button,
              ...styles.commitButton,
              ...(canCommit ? {} : styles.buttonDisabled),
            }}
          >
            Commit
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasContent}
            style={{
              ...styles.button,
              ...styles.clearButton,
              ...(hasContent ? {} : styles.buttonDisabled),
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div style={styles.content}>
        {finalSegments.length > 0 && (
          <div style={styles.finalText}>
            {finalSegments.join(' ')}
          </div>
        )}
        {partialText && (
          <div style={styles.partialText}>
            {partialText}
          </div>
        )}
        {!hasContent && (
          <div style={styles.placeholder}>Ready.</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px 20px',
    backgroundColor: '#2d2d30',
    borderBottom: '1px solid #3e3e42',
    minHeight: '80px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    color: '#858585',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  statusBadge: {
    fontSize: '11px',
    color: '#4ec9b0',
    fontWeight: 600,
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  button: {
    padding: '4px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  commitButton: {
    backgroundColor: '#0e639c',
    color: '#ffffff',
  } as React.CSSProperties,
  clearButton: {
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
  } as React.CSSProperties,
  buttonDisabled: {
    backgroundColor: '#2d2d30',
    color: '#5a5a5a',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  content: {
    fontSize: '16px',
    color: '#d4d4d4',
    lineHeight: '1.5',
  } as React.CSSProperties,
  finalText: {
    color: '#d4d4d4',
  } as React.CSSProperties,
  partialText: {
    color: '#4ec9b0',
    fontStyle: 'italic',
  } as React.CSSProperties,
  placeholder: {
    color: '#858585',
    fontStyle: 'italic',
  } as React.CSSProperties,
};

export default TranscriptPanel;
