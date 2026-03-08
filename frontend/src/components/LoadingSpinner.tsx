import React from 'react';

/**
 * 로딩 스피너 컴포넌트
 * 데이터 로딩 중 표시되는 회전 애니메이션
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner" />
    </div>
  );
};

export default LoadingSpinner;
