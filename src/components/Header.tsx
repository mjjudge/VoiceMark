import React from 'react';

const Header: React.FC = () => {
  return (
    <header style={styles.header}>
      <div style={styles.leftSection}>
        <h1 style={styles.appName}>VoiceMark</h1>
      </div>
      <div style={styles.rightSection}>
        <select style={styles.localeDropdown} defaultValue="en-GB">
          <option value="en-GB">en-GB</option>
          <option value="en-US">en-US</option>
        </select>
        <button style={styles.settingsButton} title="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
  } as React.CSSProperties,
  leftSection: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,
  appName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#d4d4d4',
  } as React.CSSProperties,
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  localeDropdown: {
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    fontSize: '14px',
  } as React.CSSProperties,
  settingsButton: {
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  } as React.CSSProperties,
};

export default Header;
