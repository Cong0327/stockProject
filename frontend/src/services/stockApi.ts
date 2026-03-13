import axios from 'axios';

// API 기본 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 주식 검색 결과 타입 정의
export interface StockSearchResult {
  symbol: string;
  instrumentName: string;
  exchange: string;
  instrumentType: string;
}

// 캔들 데이터 타입 정의
export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 백엔드 캔들 응답 래퍼 타입
interface CandleApiResponse {
  symbol: string;
  candles: {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

/**
 * 키워드로 주식 종목을 검색하는 함수
 * @param keyword 검색 키워드 (종목명 또는 심볼)
 * @returns 검색 결과 배열
 */
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  try {
    console.log(`[API] 종목 검색 요청: keyword=${keyword}`);
    const response = await api.get<StockSearchResult[]>('/stock/search', {
      params: { keyword },
    });
    console.log(`[API] 종목 검색 응답:`, response.status, response.data);
    return response.data;
  } catch (error) {
    // 검색 요청 실패 시 빈 배열 반환
    if (axios.isAxiosError(error)) {
      console.error('[API] 주식 검색 오류:', error.response?.status, error.response?.data || error.message);
    } else {
      console.error('[API] 주식 검색 중 알 수 없는 오류 발생:', error);
    }
    return [];
  }
}

/**
 * 특정 종목의 캔들 차트 데이터를 가져오는 함수
 * @param symbol 종목 심볼
 * @param interval 차트 간격 (예: '1min', '5min', '1day')
 * @returns 캔들 데이터 배열
 */
export async function getCandles(
  symbol: string,
  interval: string = '1day'
): Promise<CandleData[]> {
  try {
    console.log(`[API] 캔들 데이터 요청: symbol=${symbol}, interval=${interval}`);
    const response = await api.get<CandleApiResponse>('/stock/candles', {
      params: { symbol, interval },
    });
    console.log(`[API] 캔들 데이터 응답:`, response.status, response.data);

    // 백엔드 응답의 datetime → time 필드 매핑, 시간순 정렬
    const candles = (response.data.candles || []).map((c) => ({
      time: c.datetime,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
    candles.sort((a, b) => a.time.localeCompare(b.time));
    return candles;
  } catch (error) {
    // 캔들 데이터 요청 실패 시 빈 배열 반환
    if (axios.isAxiosError(error)) {
      console.error('[API] 캔들 데이터 조회 오류:', error.response?.status, error.response?.data || error.message);
    } else {
      console.error('[API] 캔들 데이터 조회 중 알 수 없는 오류 발생:', error);
    }
    return [];
  }
}

export default api;
