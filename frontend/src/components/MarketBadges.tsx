import React, { useEffect, useCallback } from 'react';
import { useStockStore } from '../store/stockStore';

const MarketBadges: React.FC = () => {
  const marketQuotes = useStockStore((state) => state.marketQuotes);
  const isMarketStale = useStockStore((state) => state.isMarketStale);
  const fetchMarketQuotes = useStockStore((state) => state.fetchMarketQuotes);

  // 앱 로드 시 1회만 호출 (캐시가 있으면 API 호출 안 함)
  useEffect(() => {
    fetchMarketQuotes(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(() => {
    fetchMarketQuotes(true);
  }, [fetchMarketQuotes]);

  const formatValue = (value: number) => {
    if (value === 0) return '—';
    if (value >= 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const labelMap: Record<string, string> = {
    'QQQ': 'QQQ',
    'SPY': 'SPY',
    'BTC/USD': 'BTC',
    'ETH/USD': 'ETH',
    'GLD': 'GOLD ETF(GLD)',
  };

  return (
    <div className="market-badges-wrapper">
      {isMarketStale && (
        <div className="stale-banner">
          데이터 업데이트 지연 중 — 캐시된 데이터를 표시합니다
        </div>
      )}
      <div className="market-badges">
        {marketQuotes.map((q) => (
          <div key={q.symbol} className={`market-badge${q.is_stale ? ' stale' : ''}`}>
            <span className="badge-label">{labelMap[q.symbol] || q.name}</span>
            <span className="badge-value">{formatValue(q.close)}</span>
            <span className={`badge-change ${q.percent_change >= 0 ? 'badge-up' : 'badge-down'}`}>
              {q.percent_change >= 0 ? '+' : ''}{q.percent_change.toFixed(2)}%
            </span>
          </div>
        ))}
        <button className="badge-refresh-btn" onClick={handleRefresh} title="새로고침">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6" />
            <path d="M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MarketBadges;
