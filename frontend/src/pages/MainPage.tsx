import React from 'react';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { useStockStore } from '../store/stockStore';

/**
 * 메인 페이지 컴포넌트
 * 검색, 차트, 에러 표시를 포함하는 전체 레이아웃
 */
const MainPage: React.FC = () => {
  const isLoading = useStockStore((state) => state.isLoading);
  const error = useStockStore((state) => state.error);
  const selectedSymbol = useStockStore((state) => state.selectedSymbol);

  return (
    <div className="main-page">
      {/* 종목 검색 영역 */}
      <StockSearch />

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 로딩 상태 또는 차트 표시 */}
      {isLoading && selectedSymbol ? (
        <LoadingSpinner />
      ) : (
        <StockChart />
      )}
    </div>
  );
};

export default MainPage;
