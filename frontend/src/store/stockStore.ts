import { create } from 'zustand';
import { searchStocks, getCandles, getMarketQuotes, RateLimitError } from '../services/stockApi';
import type { StockSearchResult, CandleData, MarketQuote } from '../services/stockApi';

interface CurrentPrice {
  symbol: string;
  price: number;
  time: number;
}

interface StockState {
  selectedSymbol: string | null;
  selectedName: string | null;
  selectedInterval: string;
  searchResults: StockSearchResult[];
  candles: CandleData[];
  currentPrice: CurrentPrice | null;
  isLoading: boolean;
  error: string | null;
  // 캐시/스테일 상태
  isStaleData: boolean;
  lastFetchedKey: string | null; // "symbol_interval" - 중복 호출 방지
  // 마켓 지수
  marketQuotes: MarketQuote[];
  isMarketLoading: boolean;
  isMarketStale: boolean;
}

interface StockActions {
  setSelectedSymbol: (symbol: string | null, name?: string | null) => void;
  setSelectedInterval: (interval: string) => void;
  searchStock: (keyword: string) => Promise<void>;
  fetchCandles: (symbol: string, interval?: string, forceRefresh?: boolean) => Promise<void>;
  updateCurrentPrice: (price: CurrentPrice) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSearchResults: () => void;
  fetchMarketQuotes: (forceRefresh?: boolean) => Promise<void>;
}

type StockStore = StockState & StockActions;

export const useStockStore = create<StockStore>((set, get) => ({
  selectedSymbol: null,
  selectedName: null,
  selectedInterval: '1day',
  searchResults: [],
  candles: [],
  currentPrice: null,
  isLoading: false,
  error: null,
  isStaleData: false,
  lastFetchedKey: null,
  marketQuotes: [],
  isMarketLoading: false,
  isMarketStale: false,

  setSelectedSymbol: (symbol, name = null) =>
    set({
      selectedSymbol: symbol,
      selectedName: name,
      searchResults: [],
      error: null,
      isStaleData: false,
    }),

  setSelectedInterval: (interval: string) =>
    set({ selectedInterval: interval }),

  searchStock: async (keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: [] });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const results = await searchStocks(keyword);
      set({ searchResults: results, isLoading: false });
    } catch (error) {
      const message =
        error instanceof RateLimitError
          ? '요청 한도 초과 — 잠시 후 다시 시도해주세요'
          : error instanceof Error
            ? error.message
            : '종목 검색 중 오류가 발생했습니다.';
      set({ error: message, isLoading: false, searchResults: [] });
    }
  },

  fetchCandles: async (symbol: string, interval: string = '1day', forceRefresh: boolean = false) => {
    // 중복 호출 방지: 같은 symbol+interval을 강제 새로고침 아닌데 또 호출하면 스킵
    const fetchKey = `${symbol}_${interval}`;
    const state = get();
    if (!forceRefresh && state.lastFetchedKey === fetchKey && state.candles.length > 0) {
      return;
    }

    set({ isLoading: true, error: null, isStaleData: false });

    try {
      const result = await getCandles(symbol, interval, forceRefresh);
      set({
        candles: result.candles,
        isLoading: false,
        isStaleData: result.isStale,
        lastFetchedKey: fetchKey,
        error: result.isStale ? null : null,
      });
    } catch (error) {
      const message =
        error instanceof RateLimitError
          ? '요청 한도 초과 — 잠시 후 다시 시도해주세요'
          : error instanceof Error
            ? error.message
            : '차트 데이터를 불러오는 중 오류가 발생했습니다.';
      set({ error: message, isLoading: false, candles: [] });
    }
  },

  updateCurrentPrice: (price: CurrentPrice) =>
    set({ currentPrice: price }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setError: (error: string | null) =>
    set({ error }),

  clearSearchResults: () =>
    set({ searchResults: [] }),

  fetchMarketQuotes: async (forceRefresh: boolean = false) => {
    set({ isMarketLoading: true });

    try {
      const result = await getMarketQuotes(forceRefresh);
      set({
        marketQuotes: result.quotes,
        isMarketLoading: false,
        isMarketStale: result.isStale,
      });
    } catch {
      set({ isMarketLoading: false, isMarketStale: true });
    }
  },
}));

export default useStockStore;
