import React from 'react';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import MarketBadges from '../components/MarketBadges';
import LoadingSpinner from '../components/LoadingSpinner';
import { useStockStore } from '../store/stockStore';

const MainPage: React.FC = () => {
  const isLoading = useStockStore((state) => state.isLoading);
  const error = useStockStore((state) => state.error);
  const selectedSymbol = useStockStore((state) => state.selectedSymbol);

  return (
    <div className="main-page">
      <StockSearch />

      {error && <div className="error-message">{error}</div>}

      {isLoading && selectedSymbol ? (
        <LoadingSpinner />
      ) : (
        <StockChart />
      )}

      <MarketBadges />
    </div>
  );
};

export default MainPage;
