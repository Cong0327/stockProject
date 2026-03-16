package example.stock.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import example.stock.dto.MarketQuoteResponse;
import example.stock.dto.StockCandleResponse;
import example.stock.dto.StockSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * 주식 데이터 Redis 캐시 서비스
 * 캔들 데이터와 검색 결과를 캐싱하여 API 호출을 최소화한다.
 */
@Service
public class StockCacheService {

    private static final Logger log = LoggerFactory.getLogger(StockCacheService.class);

    /** 캐시 유효 시간 (5분) */
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    /** 캔들 데이터 캐시 키 패턴 */
    private static final String CANDLE_KEY_PATTERN = "stock:candles:%s:%s";

    /** 검색 결과 캐시 키 패턴 */
    private static final String SEARCH_KEY_PATTERN = "stock:search:%s";

    /** 시세 일괄 조회 캐시 키 패턴 */
    private static final String QUOTES_KEY_PATTERN = "stock:quotes:%s";

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public StockCacheService(RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 캐시에서 캔들 데이터를 조회한다.
     *
     * @param symbol   종목 심볼
     * @param interval 시간 간격
     * @return 캐시된 캔들 응답 (없으면 Optional.empty)
     */
    public Optional<StockCandleResponse> getCachedCandles(String symbol, String interval) {
        try {
            String key = String.format(CANDLE_KEY_PATTERN, symbol, interval);
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                String json = objectMapper.writeValueAsString(cached);
                StockCandleResponse response = objectMapper.readValue(json, StockCandleResponse.class);
                log.debug("캔들 캐시 적중: symbol={}, interval={}", symbol, interval);
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.warn("캔들 캐시 조회 실패: symbol={}, interval={}, error={}", symbol, interval, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * 캔들 데이터를 캐시에 저장한다.
     *
     * @param symbol   종목 심볼
     * @param interval 시간 간격
     * @param response 캔들 응답 데이터
     */
    public void cacheCandles(String symbol, String interval, StockCandleResponse response) {
        try {
            String key = String.format(CANDLE_KEY_PATTERN, symbol, interval);
            redisTemplate.opsForValue().set(key, response, CACHE_TTL);
            log.debug("캔들 데이터 캐시 저장: symbol={}, interval={}", symbol, interval);
        } catch (Exception e) {
            log.warn("캔들 캐시 저장 실패: symbol={}, interval={}, error={}", symbol, interval, e.getMessage());
        }
    }

    /**
     * 캐시에서 검색 결과를 조회한다.
     *
     * @param keyword 검색 키워드
     * @return 캐시된 검색 결과 목록 (없으면 Optional.empty)
     */
    public Optional<List<StockSearchResponse>> getCachedSearchResult(String keyword) {
        try {
            String key = String.format(SEARCH_KEY_PATTERN, keyword);
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                String json = objectMapper.writeValueAsString(cached);
                List<StockSearchResponse> result = objectMapper.readValue(json, new TypeReference<>() {});
                log.debug("검색 캐시 적중: keyword={}", keyword);
                return Optional.of(result);
            }
        } catch (Exception e) {
            log.warn("검색 캐시 조회 실패: keyword={}, error={}", keyword, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * 검색 결과를 캐시에 저장한다.
     *
     * @param keyword 검색 키워드
     * @param results 검색 결과 목록
     */
    public void cacheSearchResult(String keyword, List<StockSearchResponse> results) {
        try {
            String key = String.format(SEARCH_KEY_PATTERN, keyword);
            redisTemplate.opsForValue().set(key, results, CACHE_TTL);
            log.debug("검색 결과 캐시 저장: keyword={}", keyword);
        } catch (Exception e) {
            log.warn("검색 캐시 저장 실패: keyword={}, error={}", keyword, e.getMessage());
        }
    }

    /**
     * 캐시에서 시세 일괄 조회 결과를 조회한다.
     *
     * @param symbols 쉼표로 연결된 심볼 목록
     * @return 캐시된 시세 목록 (없으면 Optional.empty)
     */
    public Optional<List<MarketQuoteResponse>> getCachedQuotes(String symbols) {
        try {
            String key = String.format(QUOTES_KEY_PATTERN, symbols);
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                String json = objectMapper.writeValueAsString(cached);
                List<MarketQuoteResponse> result = objectMapper.readValue(json, new TypeReference<>() {});
                log.debug("시세 캐시 적중: symbols={}", symbols);
                return Optional.of(result);
            }
        } catch (Exception e) {
            log.warn("시세 캐시 조회 실패: symbols={}, error={}", symbols, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * 시세 일괄 조회 결과를 캐시에 저장한다.
     *
     * @param symbols 쉼표로 연결된 심볼 목록
     * @param quotes  시세 응답 목록
     */
    public void cacheQuotes(String symbols, List<MarketQuoteResponse> quotes) {
        try {
            String key = String.format(QUOTES_KEY_PATTERN, symbols);
            redisTemplate.opsForValue().set(key, quotes, CACHE_TTL);
            log.debug("시세 캐시 저장: symbols={}", symbols);
        } catch (Exception e) {
            log.warn("시세 캐시 저장 실패: symbols={}, error={}", symbols, e.getMessage());
        }
    }

    /**
     * 특정 종목의 모든 캐시를 삭제한다.
     *
     * @param symbol 종목 심볼
     */
    public void evictCache(String symbol) {
        try {
            // 주요 간격에 대한 캔들 캐시를 삭제한다
            String[] intervals = {"1min", "5min", "15min", "30min", "1h", "1day", "1week", "1month"};
            for (String interval : intervals) {
                String key = String.format(CANDLE_KEY_PATTERN, symbol, interval);
                redisTemplate.delete(key);
            }
            log.debug("캐시 삭제 완료: symbol={}", symbol);
        } catch (Exception e) {
            log.warn("캐시 삭제 실패: symbol={}, error={}", symbol, e.getMessage());
        }
    }
}
