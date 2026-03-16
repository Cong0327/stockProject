import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from 'lightweight-charts';
import { useStockStore } from '../store/stockStore';

const INTERVAL_OPTIONS = [
  { value: '1min', label: '1분' },
  { value: '5min', label: '5분' },
  { value: '1hour', label: '60분' },
  { value: '1day', label: '일봉' },
  { value: '1week', label: '주봉' },
  { value: '1month', label: '월봉' },
] as const;

const StockChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const selectedSymbol = useStockStore((state) => state.selectedSymbol);
  const selectedName = useStockStore((state) => state.selectedName);
  const selectedInterval = useStockStore((state) => state.selectedInterval);
  const candles = useStockStore((state) => state.candles);
  const currentPrice = useStockStore((state) => state.currentPrice);
  const isStaleData = useStockStore((state) => state.isStaleData);
  const fetchCandles = useStockStore((state) => state.fetchCandles);
  const setSelectedInterval = useStockStore((state) => state.setSelectedInterval);

  const handleIntervalChange = useCallback((interval: string) => {
    setSelectedInterval(interval);
    if (selectedSymbol) {
      fetchCandles(selectedSymbol, interval);
    }
  }, [selectedSymbol, setSelectedInterval, fetchCandles]);

  // 수동 새로고침: forceRefresh=true로 캐시 무시
  const handleRefresh = useCallback(() => {
    if (selectedSymbol) {
      fetchCandles(selectedSymbol, selectedInterval, true);
    }
  }, [selectedSymbol, selectedInterval, fetchCandles]);

  // 차트 생성 (1회)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.15)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.15)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(59, 130, 246, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
      },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderDownColor: '#f43f5e',
      borderUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      wickUpColor: '#10b981',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // 캔들 데이터 → 차트 반영
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const chartData: CandlestickData<Time>[] = candles.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeriesRef.current.setData(chartData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // 실시간 가격 업데이트
  useEffect(() => {
    if (
      !candleSeriesRef.current ||
      !currentPrice ||
      currentPrice.symbol !== selectedSymbol ||
      candles.length === 0
    ) {
      return;
    }

    const lastCandle = candles[candles.length - 1];
    const price = currentPrice.price;

    candleSeriesRef.current.update({
      time: lastCandle.time as Time,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, price),
      low: Math.min(lastCandle.low, price),
      close: price,
    });
  }, [currentPrice, selectedSymbol, candles]);

  // 빈 상태
  if (!selectedSymbol) {
    return (
      <div className="chart-container">
        <div className="empty-state">
          <div className="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 5-9" />
            </svg>
          </div>
          <div className="message">종목을 검색하여 차트를 확인하세요</div>
        </div>
      </div>
    );
  }

  const lastPrice =
    currentPrice?.symbol === selectedSymbol
      ? currentPrice.price
      : candles.length > 0
        ? candles[candles.length - 1].close
        : null;

  const priceDirection =
    candles.length > 1 && lastPrice !== null
      ? lastPrice >= candles[candles.length - 2]?.close
        ? 'up'
        : 'down'
      : 'up';

  return (
    <div className="chart-container">
      {/* 스테일 데이터 배너 */}
      {isStaleData && (
        <div className="stale-banner">
          데이터 업데이트 지연 중 — 캐시된 데이터를 표시합니다
          <button className="stale-retry-btn" onClick={handleRefresh}>
            다시 시도
          </button>
        </div>
      )}

      <div className="chart-header">
        <div className="symbol-name">
          {selectedSymbol}
          {selectedName && (
            <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '8px', fontWeight: 500 }}>
              {selectedName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastPrice !== null && (
            <div className={`current-price price-${priceDirection}`}>
              {lastPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
          <button className="chart-refresh-btn" onClick={handleRefresh} title="데이터 새로고침">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="interval-selector">
        {INTERVAL_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`interval-btn${selectedInterval === option.value ? ' active' : ''}`}
            onClick={() => handleIntervalChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="chart-wrapper" ref={chartContainerRef} />
    </div>
  );
};

export default StockChart;
