import { create } from 'zustand';
import { searchStocks, getCandles } from '../services/stockApi';
import type { StockSearchResult, CandleData } from '../services/stockApi';

// 실시간 가격 정보 타입 정의
interface CurrentPrice {
  symbol: string;
  price: number;
  time: number;
}

// 스토어 상태 타입 정의
interface StockState {
  selectedSymbol: string | null;
  selectedName: string | null;
  searchResults: StockSearchResult[];
  candles: CandleData[];
  currentPrice: CurrentPrice | null;
  isLoading: boolean;
  error: string | null;
}

// 스토어 액션 타입 정의
interface StockActions {
  setSelectedSymbol: (symbol: string | null, name?: string | null) => void;
  searchStock: (keyword: string) => Promise<void>;
  fetchCandles: (symbol: string, interval?: string) => Promise<void>;
  updateCurrentPrice: (price: CurrentPrice) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSearchResults: () => void;
}

// 스토어 전체 타입
type StockStore = StockState & StockActions;

/**
 * Zustand 전역 상태 관리 스토어
 * 주식 검색, 차트 데이터, 실시간 가격을 관리
 */
export const useStockStore = create<StockStore>((set) => ({
  // 초기 상태
  selectedSymbol: null,
  selectedName: null,
  searchResults: [],
  candles: [],
  currentPrice: null,
  isLoading: false,
  error: null,

  // 선택된 종목 설정
  setSelectedSymbol: (symbol, name = null) =>
    set({
      selectedSymbol: symbol,
      selectedName: name,
      searchResults: [],
      error: null,
    }),

  // 종목 검색 실행
  searchStock: async (keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: [] });
      return;
    }

    console.log(`[Store] 종목 검색 시작: keyword=${keyword}`);
    set({ isLoading: true, error: null });

    try {
      const results = await searchStocks(keyword);
      console.log(`[Store] 종목 검색 완료: ${results.length}건`, results);
      set({ searchResults: results, isLoading: false });
    } catch (error) {
      // 검색 실패 시 에러 메시지 설정
      const message =
        error instanceof Error ? error.message : '종목 검색 중 오류가 발생했습니다.';
      set({ error: message, isLoading: false, searchResults: [] });
    }
  },

  // 캔들 차트 데이터 조회
  fetchCandles: async (symbol: string, interval: string = '1day') => {
    console.log(`[Store] 캔들 데이터 요청: symbol=${symbol}, interval=${interval}`);
    set({ isLoading: true, error: null });

    try {
      const data = await getCandles(symbol, interval);
      console.log(`[Store] 캔들 데이터 완료: ${data.length}건`, data);
      set({ candles: data, isLoading: false });
    } catch (error) {
      // 데이터 조회 실패 시 에러 메시지 설정
      const message =
        error instanceof Error
          ? error.message
          : '차트 데이터를 불러오는 중 오류가 발생했습니다.';
      set({ error: message, isLoading: false, candles: [] });
    }
  },

  // 실시간 가격 업데이트
  updateCurrentPrice: (price: CurrentPrice) =>
    set({ currentPrice: price }),

  // 로딩 상태 설정
  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  // 에러 메시지 설정
  setError: (error: string | null) =>
    set({ error }),

  // 검색 결과 초기화
  clearSearchResults: () =>
    set({ searchResults: [] }),
}));

export default useStockStore;
