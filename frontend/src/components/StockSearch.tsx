import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStockStore } from '../store/stockStore';
import LoadingSpinner from './LoadingSpinner';

const StockSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchResults = useStockStore((state) => state.searchResults);
  const isLoading = useStockStore((state) => state.isLoading);
  const selectedInterval = useStockStore((state) => state.selectedInterval);
  const searchStock = useStockStore((state) => state.searchStock);
  const setSelectedSymbol = useStockStore((state) => state.setSelectedSymbol);
  const fetchCandles = useStockStore((state) => state.fetchCandles);
  const clearSearchResults = useStockStore((state) => state.clearSearchResults);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setKeyword(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        clearSearchResults();
        setShowDropdown(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        searchStock(value);
        setShowDropdown(true);
      }, 300);
    },
    [searchStock, clearSearchResults]
  );

  const handleResultClick = useCallback(
    (symbol: string, name: string) => {
      setSelectedSymbol(symbol, name);
      fetchCandles(symbol, selectedInterval);
      setKeyword(symbol);
      setShowDropdown(false);
    },
    [setSelectedSymbol, fetchCandles, selectedInterval]
  );

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="search-container" ref={containerRef}>
      <span className="search-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
      <input
        type="text"
        className="search-input"
        placeholder="종목명 또는 심볼 검색 (예: AAPL, TSLA, NVDA)"
        value={keyword}
        onChange={handleInputChange}
        onFocus={() => {
          if (keyword.trim() && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
      />

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
                color: '#64748b',
                fontSize: '0.8rem',
              }}
            >
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearch;
