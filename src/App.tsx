import React from 'react';
import Header from './components/Header';
import TranscriptPanel from './components/TranscriptPanel';
import Editor from './components/Editor';
import Footer from './components/Footer';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <div style={styles.app}>
      <Header />
      <TranscriptPanel />
      <Editor />
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
};

export default App;
