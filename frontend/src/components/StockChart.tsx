import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from 'lightweight-charts';
import { useStockStore } from '../store/stockStore';

/**
 * 주식 캔들스틱 차트 컴포넌트
 * TradingView Lightweight Charts 라이브러리를 사용하여
 * 캔들 차트와 실시간 가격 업데이트를 표시
 */
const StockChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const selectedSymbol = useStockStore((state) => state.selectedSymbol);
  const selectedName = useStockStore((state) => state.selectedName);
  const candles = useStockStore((state) => state.candles);
  const currentPrice = useStockStore((state) => state.currentPrice);

  // 차트 생성 및 정리
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 다크 테마 설정으로 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#16213e' },
        textColor: '#8892b0',
      },
      grid: {
        vertLines: { color: 'rgba(15, 52, 96, 0.5)' },
        horzLines: { color: 'rgba(15, 52, 96, 0.5)' },
      },
      crosshair: {
        vertLine: { color: '#e94560', width: 1, style: 2 },
        horzLine: { color: '#e94560', width: 1, style: 2 },
      },
      timeScale: {
        borderColor: '#0f3460',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#0f3460',
      },
      autoSize: true,
    });

    // 캔들스틱 시리즈 추가
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // 컴포넌트 언마운트 시 차트 정리
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // 캔들 데이터 업데이트
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // API 응답 데이터를 차트 데이터 형식으로 변환
    const chartData: CandlestickData<Time>[] = candles.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeriesRef.current.setData(chartData);

    // 전체 데이터가 보이도록 타임스케일 조정
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // 실시간 가격 업데이트 처리
  useEffect(() => {
    if (
      !candleSeriesRef.current ||
      !currentPrice ||
      currentPrice.symbol !== selectedSymbol
    ) {
      return;
    }

    // 실시간 가격으로 마지막 캔들 업데이트
    const timeInSeconds = Math.floor(currentPrice.time / 1000) as Time;

    candleSeriesRef.current.update({
      time: timeInSeconds,
      open: currentPrice.price,
      high: currentPrice.price,
      low: currentPrice.price,
      close: currentPrice.price,
    });
  }, [currentPrice, selectedSymbol]);

  // 종목이 선택되지 않은 경우 빈 상태 표시
  if (!selectedSymbol) {
    return (
      <div className="chart-container">
        <div className="empty-state">
          <div className="icon">&#x1F4C8;</div>
          <div className="message">
            종목을 검색하여 차트를 확인하세요
          </div>
        </div>
      </div>
    );
  }

  // 마지막 가격 정보 계산
  const lastPrice =
    currentPrice?.symbol === selectedSymbol
      ? currentPrice.price
      : candles.length > 0
        ? candles[candles.length - 1].close
        : null;

  // 가격 변동 방향 판단 (상승/하락)
  const priceDirection =
    candles.length > 1 && lastPrice !== null
      ? lastPrice >= candles[candles.length - 2]?.close
        ? 'up'
        : 'down'
      : 'up';

  return (
    <div className="chart-container">
      {/* 차트 헤더: 종목명과 현재 가격 표시 */}
      <div className="chart-header">
        <div className="symbol-name">
          {selectedSymbol}
          {selectedName && (
            <span style={{ color: '#8892b0', fontSize: '0.85rem', marginLeft: '8px' }}>
              {selectedName}
            </span>
          )}
        </div>
        {lastPrice !== null && (
          <div className={`current-price price-${priceDirection}`}>
            {lastPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </div>

      {/* 차트 렌더링 영역 */}
      <div className="chart-wrapper" ref={chartContainerRef} />
    </div>
  );
};

export default StockChart;
