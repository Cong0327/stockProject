import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStockStore } from '../store/stockStore';
import LoadingSpinner from './LoadingSpinner';

/**
 * 주식 종목 검색 컴포넌트
 * 디바운스가 적용된 검색 입력과 결과 드롭다운을 제공
 */
const StockSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchResults = useStockStore((state) => state.searchResults);
  const isLoading = useStockStore((state) => state.isLoading);
  const searchStock = useStockStore((state) => state.searchStock);
  const setSelectedSymbol = useStockStore((state) => state.setSelectedSymbol);
  const fetchCandles = useStockStore((state) => state.fetchCandles);
  const clearSearchResults = useStockStore((state) => state.clearSearchResults);

  // 디바운스 검색 처리 (300ms 지연)
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setKeyword(value);

      // 이전 디바운스 타이머 정리
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        clearSearchResults();
        setShowDropdown(false);
        return;
      }

      // 300ms 후 검색 실행
      debounceRef.current = setTimeout(() => {
        searchStock(value);
        setShowDropdown(true);
      }, 300);
    },
    [searchStock, clearSearchResults]
  );

  // 검색 결과 항목 클릭 핸들러
  const handleResultClick = useCallback(
    (symbol: string, name: string) => {
      setSelectedSymbol(symbol, name);
      fetchCandles(symbol);
      setKeyword(symbol);
      setShowDropdown(false);
    },
    [setSelectedSymbol, fetchCandles]
  );

  // 드롭다운 외부 클릭 감지하여 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 컴포넌트 언마운트 시 디바운스 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="search-container" ref={containerRef}>
      <input
        type="text"
        className="search-input"
        placeholder="종목명 또는 심볼을 입력하세요 (예: AAPL, 삼성전자)"
        value={keyword}
        onChange={handleInputChange}
        onFocus={() => {
          // 입력값이 있고 검색 결과가 있으면 드롭다운 표시
          if (keyword.trim() && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
      />

      {/* 검색 결과 드롭다운 */}
      {showDropdown && (
        <div className="search-dropdown">
          {isLoading ? (
            <LoadingSpinner />
          ) : searchResults.length > 0 ? (
            searchResults.map((result) => (
              <div
                key={`${result.symbol}-${result.exchange}`}
                className="search-result-item"
                onClick={() =>
                  handleResultClick(result.symbol, result.instrumentName)
                }
              >
                <div className="symbol">{result.symbol}</div>
                <div className="name">{result.instrumentName}</div>
                <div className="exchange">
                  {result.exchange} · {result.instrumentType}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: '#5a6a8a',
              }}
            >
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearch;
