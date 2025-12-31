import React, { useState } from 'react';

const Footer: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [autoCommit, setAutoCommit] = useState(true);
  const [commandMode, setCommandMode] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.leftSection}>
        <button
          style={{
            ...styles.recordButton,
            backgroundColor: isRecording ? '#d13438' : '#4ec9b0',
          }}
          onClick={toggleRecording}
        >
          {isRecording ? '⏹ Stop' : '⏺ Record'}
        </button>
      </div>
      
      <div style={styles.centerSection}>
        <div style={styles.toggleGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={autoCommit}
              onChange={(e) => setAutoCommit(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.toggleText}>Auto-Commit</span>
          </label>
        </div>
        
        <div style={styles.toggleGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={commandMode}
              onChange={(e) => setCommandMode(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.toggleText}>Command Mode</span>
          </label>
        </div>
      </div>
      
      <div style={styles.rightSection}>
        <span style={styles.statusText}>Mic Ready.</span>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#252526',
    borderTop: '1px solid #3e3e42',
    minHeight: '60px',
  } as React.CSSProperties,
  leftSection: {
    flex: '0 0 auto',
  } as React.CSSProperties,
  centerSection: {
    display: 'flex',
    gap: '24px',
    flex: '1',
    justifyContent: 'center',
  } as React.CSSProperties,
  rightSection: {
    flex: '0 0 auto',
  } as React.CSSProperties,
  recordButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    transition: 'all 0.2s',
    minWidth: '120px',
  } as React.CSSProperties,
  toggleGroup: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '8px',
  } as React.CSSProperties,
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  } as React.CSSProperties,
  toggleText: {
    fontSize: '14px',
    color: '#d4d4d4',
    userSelect: 'none' as const,
  } as React.CSSProperties,
  statusText: {
    fontSize: '14px',
    color: '#4ec9b0',
    fontWeight: 500,
  } as React.CSSProperties,
};

export default Footer;
