import React from 'react';

const TranscriptPanel: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.label}>Live Transcript</div>
      <div style={styles.content}>Ready.</div>
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
  label: {
    fontSize: '12px',
    color: '#858585',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  content: {
    fontSize: '16px',
    color: '#4ec9b0',
    fontStyle: 'italic',
  } as React.CSSProperties,
};

export default TranscriptPanel;
