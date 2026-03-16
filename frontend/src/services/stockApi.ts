import axios from 'axios';
import { getCache, setCache, getStaleCache } from './apiCache';

// API 기본 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── 타입 정의 ───

export interface StockSearchResult {
  symbol: string;
  instrumentName: string;
  exchange: string;
  instrumentType: string;
}

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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

export interface MarketQuote {
  symbol: string;
  name: string;
  close: number;
  percent_change: number;
  is_stale?: boolean;
}

// ─── 429 Rate Limit 감지 ───

export class RateLimitError extends Error {
  constructor(message: string = 'API 요청 한도를 초과했습니다') {
    super(message);
    this.name = 'RateLimitError';
  }
}

function isRateLimited(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

// ─── 캐시 TTL 상수 ───

const SEARCH_CACHE_TTL = 60_000;  // 검색: 60초
const CANDLE_CACHE_TTL = 60_000;  // 캔들: 60초
const MARKET_CACHE_TTL = 120_000; // 마켓 지수: 120초 (호출 빈도 최소화)

// ─── 검색 (캐시 적용) ───

export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const cacheKey = `search_${keyword.toLowerCase().trim()}`;

  // 1) 캐시 히트
  const cached = getCache<StockSearchResult[]>(cacheKey);
  if (cached) {
    console.log(`[API] 검색 캐시 히트: ${keyword}`);
    return cached;
  }

  // 2) API 호출
  try {
    const response = await api.get<StockSearchResult[]>('/stock/search', {
      params: { keyword },
    });
    const data = response.data;
    setCache(cacheKey, data, SEARCH_CACHE_TTL);
    return data;
  } catch (error) {
    if (isRateLimited(error)) {
      // 429: 스테일 캐시 폴백
      const stale = getStaleCache<StockSearchResult[]>(cacheKey);
      if (stale) return stale;
      throw new RateLimitError();
    }
    if (axios.isAxiosError(error)) {
      console.error('[API] 검색 오류:', error.response?.status, error.response?.data || error.message);
    }
    return [];
  }
}

// ─── 캔들 데이터 (캐시 적용) ───

export interface GetCandlesResult {
  candles: CandleData[];
  fromCache: boolean;
  isStale: boolean;
}

export async function getCandles(
  symbol: string,
  interval: string = '1day',
  forceRefresh: boolean = false
): Promise<GetCandlesResult> {
  const cacheKey = `candles_${symbol}_${interval}`;

  // 1) 강제 새로고침이 아닌 경우 캐시 확인
  if (!forceRefresh) {
    const cached = getCache<CandleData[]>(cacheKey);
    if (cached) {
      console.log(`[API] 캔들 캐시 히트: ${symbol} ${interval}`);
      return { candles: cached, fromCache: true, isStale: false };
    }
  }

  // 2) API 호출
  try {
    const response = await api.get<CandleApiResponse>('/stock/candles', {
      params: { symbol, interval },
    });

    const isIntraday = ['1min', '5min', '15min', '30min', '1hour'].includes(interval);

    const candles = (response.data.candles || []).map((c) => ({
      // 분봉/시간봉: Unix timestamp(초)로 변환 (lightweight-charts 요구사항)
      // 일봉 이상: "YYYY-MM-DD" 문자열 그대로 사용
      time: isIntraday
        ? Math.floor(new Date(c.datetime.replace(' ', 'T') + 'Z').getTime() / 1000)
        : c.datetime.split(' ')[0],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
    candles.sort((a, b) =>
      typeof a.time === 'number'
        ? (a.time as number) - (b.time as number)
        : String(a.time).localeCompare(String(b.time))
    );

    setCache(cacheKey, candles, CANDLE_CACHE_TTL);
    return { candles, fromCache: false, isStale: false };
  } catch (error) {
    if (isRateLimited(error)) {
      // 429: 스테일 캐시 폴백
      const stale = getStaleCache<CandleData[]>(cacheKey);
      if (stale) {
        return { candles: stale, fromCache: true, isStale: true };
      }
      throw new RateLimitError();
    }
    if (axios.isAxiosError(error)) {
      console.error('[API] 캔들 오류:', error.response?.status, error.response?.data || error.message);
    }
    // 일반 에러: 스테일 캐시 시도
    const stale = getStaleCache<CandleData[]>(cacheKey);
    if (stale) {
      return { candles: stale, fromCache: true, isStale: true };
    }
    return { candles: [], fromCache: false, isStale: false };
  }
}

// ─── 마켓 지수 일괄 조회 (Batch) ───

const MARKET_SYMBOLS = [
  { symbol: 'QQQ', label: 'QQQ' },
  { symbol: 'SPY', label: 'SPY' },
  { symbol: 'BTC/USD', label: 'BTC' },
  { symbol: 'ETH/USD', label: 'ETH' },
  { symbol: 'GLD', label: 'GOLD ETF(GLD)' },
];

const MARKET_CACHE_KEY = 'market_quotes_batch';

// 하드코딩된 폴백 데이터 (API를 전혀 사용할 수 없을 때)
const FALLBACK_QUOTES: MarketQuote[] = [
  { symbol: 'QQQ', name: 'QQQ', close: 480.50, percent_change: 0, is_stale: true },
  { symbol: 'SPY', name: 'SPY', close: 563.20, percent_change: 0, is_stale: true },
  { symbol: 'BTC/USD', name: 'BTC', close: 84250.00, percent_change: 0, is_stale: true },
  { symbol: 'ETH/USD', name: 'ETH', close: 3920.50, percent_change: 0, is_stale: true },
];

export interface MarketQuotesResult {
  quotes: MarketQuote[];
  fromCache: boolean;
  isStale: boolean;
}

/**
 * 모든 마켓 지수를 단일 배치 호출로 가져옴
 * symbols=IXIC,SPX,BTC/USD,... 형태로 한 번에 요청
 */
export async function getMarketQuotes(
  forceRefresh: boolean = false
): Promise<MarketQuotesResult> {
  // 1) 캐시 확인
  if (!forceRefresh) {
    const cached = getCache<MarketQuote[]>(MARKET_CACHE_KEY);
    if (cached) {
      console.log('[API] 마켓 지수 캐시 히트');
      return { quotes: cached, fromCache: true, isStale: false };
    }
  }

  // 2) 배치 호출: 모든 심볼을 쉼표로 연결
  const symbolsParam = MARKET_SYMBOLS.map((m) => m.symbol).join(',');

  try {
    const response = await api.get('/stock/quotes', {
      params: { symbols: symbolsParam },
    });

    // 백엔드 응답을 MarketQuote 배열로 매핑
    const rawData = response.data;
    const quotes: MarketQuote[] = MARKET_SYMBOLS.map((m) => {
      const quote = Array.isArray(rawData)
        ? rawData.find((q: Record<string, unknown>) => q.symbol === m.symbol)
        : rawData[m.symbol];

      if (quote) {
        return {
          symbol: m.symbol,
          name: m.label,
          close: Number(quote.close) || 0,
          percent_change: Number(quote.percent_change) || 0,
        };
      }
      return {
        symbol: m.symbol,
        name: m.label,
        close: 0,
        percent_change: 0,
      };
    });

    setCache(MARKET_CACHE_KEY, quotes, MARKET_CACHE_TTL);
    return { quotes, fromCache: false, isStale: false };
  } catch (error) {
    // 429 또는 기타 에러 → 스테일 캐시 → 하드코딩 폴백
    if (isRateLimited(error)) {
      console.warn('[API] 마켓 지수 429 Rate Limited');
    } else if (axios.isAxiosError(error)) {
      console.error('[API] 마켓 지수 오류:', error.response?.status, error.response?.data || error.message);
    }

    const stale = getStaleCache<MarketQuote[]>(MARKET_CACHE_KEY);
    if (stale) {
      return {
        quotes: stale.map((q) => ({ ...q, is_stale: true })),
        fromCache: true,
        isStale: true,
      };
    }

    return { quotes: FALLBACK_QUOTES, fromCache: false, isStale: true };
  }
}

export { MARKET_SYMBOLS };
export default api;
