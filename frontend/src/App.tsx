import React from 'react';
import MainPage from './pages/MainPage';
import { useWebSocket } from './hooks/useWebSocket';

const App: React.FC = () => {
  useWebSocket();

  return (
    <>
      <header className="app-header">
        <h1>Stock Dashboard</h1>
        <span className="subtitle">Real-time Market Data</span>
      </header>
      <MainPage />
    </>
  );
};

export default App;
