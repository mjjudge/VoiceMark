import React from 'react';

const EditorPlaceholder: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.placeholder}>
        <div style={styles.icon}>📝</div>
        <div style={styles.text}>Markdown Editor</div>
        <div style={styles.subtext}>(Editor functionality coming soon)</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: '20px',
    backgroundColor: '#1e1e1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
  } as React.CSSProperties,
  placeholder: {
    textAlign: 'center' as const,
    color: '#858585',
  } as React.CSSProperties,
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  } as React.CSSProperties,
  text: {
    fontSize: '18px',
    fontWeight: 500,
    marginBottom: '8px',
  } as React.CSSProperties,
  subtext: {
    fontSize: '14px',
    fontStyle: 'italic',
  } as React.CSSProperties,
};

export default EditorPlaceholder;
