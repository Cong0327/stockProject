import React from 'react';
import MainPage from './pages/MainPage';
import { useWebSocket } from './hooks/useWebSocket';

/**
 * 앱 루트 컴포넌트
 * 웹소켓 연결을 관리하고 전체 레이아웃을 구성
 */
const App: React.FC = () => {
  // 웹소켓 라이프사이클 관리 (연결, 구독, 해제)
  useWebSocket();

  return (
    <>
      {/* 앱 헤더 */}
      <header className="app-header">
        <h1>실시간 주식 차트</h1>
        <span className="subtitle">실시간 시세 및 캔들 차트</span>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <MainPage />
    </>
  );
};

export default App;
