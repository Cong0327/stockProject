const CACHE_PREFIX = 'stock_cache_';
const DEFAULT_TTL_MS = 60_000; // 60초

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/** localStorage에 데이터 저장 (TTL 포함) */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 시 오래된 캐시 정리 후 재시도
    clearExpiredCache();
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // 그래도 실패하면 무시
    }
  }
}

/** localStorage에서 캐시 조회. TTL 유효하면 data 반환, 만료면 null */
export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    return null; // 만료
  } catch {
    return null;
  }
}

/** TTL 무시하고 마지막 저장된 데이터를 반환 (폴백용) */
export function getStaleCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/** 만료된 캐시 항목 모두 제거 */
export function clearExpiredCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry: CacheEntry<unknown> = JSON.parse(raw);
      if (Date.now() - entry.timestamp >= entry.ttl) {
        keysToRemove.push(key);
      }
    } catch {
      keysToRemove.push(key!);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
