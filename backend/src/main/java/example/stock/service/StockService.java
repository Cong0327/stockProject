package example.stock.service;

import example.stock.cache.StockCacheService;
import example.stock.dto.MarketQuoteResponse;
import example.stock.dto.StockCandleResponse;
import example.stock.dto.StockSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * 주식 데이터 오케스트레이션 서비스
 * 캐시를 먼저 확인하고, 캐시 미스 시 API를 호출한 뒤 결과를 캐싱한다.
 */
@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final StockCacheService cacheService;
    private final StockApiService apiService;

    public StockService(StockCacheService cacheService, StockApiService apiService) {
        this.cacheService = cacheService;
        this.apiService = apiService;
    }

    /**
     * 종목을 검색한다.
     * Redis 캐시를 먼저 확인하고, 없으면 API를 호출한 뒤 결과를 캐싱한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    public List<StockSearchResponse> searchStock(String keyword) {
        // 캐시에서 먼저 조회한다
        Optional<List<StockSearchResponse>> cached = cacheService.getCachedSearchResult(keyword);
        if (cached.isPresent()) {
            log.info("검색 캐시 적중: keyword={}", keyword);
            return cached.get();
        }

        // 캐시 미스: API 호출 후 캐싱한다
        log.info("검색 캐시 미스: API 호출 시작, keyword={}", keyword);
        try {
            List<StockSearchResponse> results = apiService.searchSymbol(keyword).block();
            if (results != null && !results.isEmpty()) {
                cacheService.cacheSearchResult(keyword, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            log.error("종목 검색 실패: keyword={}, error={}", keyword, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 마켓 지수 시세를 일괄 조회한다.
     * Redis 캐시를 먼저 확인하고, 없으면 API를 호출한 뒤 결과를 캐싱한다.
     *
     * @param symbols 쉼표로 연결된 심볼 목록
     * @return 시세 응답 목록
     */
    public List<MarketQuoteResponse> getQuotes(String symbols) {
        Optional<List<MarketQuoteResponse>> cached = cacheService.getCachedQuotes(symbols);
        if (cached.isPresent()) {
            log.info("시세 캐시 적중: symbols={}", symbols);
            return cached.get();
        }

        log.info("시세 캐시 미스: API 호출 시작, symbols={}", symbols);
        try {
            List<MarketQuoteResponse> results = apiService.getQuotes(symbols).block();
            if (results != null && !results.isEmpty()) {
                cacheService.cacheQuotes(symbols, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            log.error("시세 일괄 조회 실패: symbols={}, error={}", symbols, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 캔들 데이터를 조회한다.
     * Redis 캐시를 먼저 확인하고, 없으면 API를 호출한 뒤 결과를 캐싱한다.
     *
     * @param symbol   종목 심볼
     * @param interval 시간 간격
     * @return 캔들 응답 데이터
     */
    public StockCandleResponse getCandles(String symbol, String interval) {
        // 캐시에서 먼저 조회한다
        Optional<StockCandleResponse> cached = cacheService.getCachedCandles(symbol, interval);
        if (cached.isPresent()) {
            log.info("캔들 캐시 적중: symbol={}, interval={}", symbol, interval);
            return cached.get();
        }

        // 캐시 미스: API 호출 후 캐싱한다
        log.info("캔들 캐시 미스: API 호출 시작, symbol={}, interval={}", symbol, interval);
        try {
            StockCandleResponse response = apiService.getCandles(symbol, interval).block();
            if (response != null && response.getCandles() != null && !response.getCandles().isEmpty()) {
                cacheService.cacheCandles(symbol, interval, response);
            }
            return response != null ? response : StockCandleResponse.builder()
                    .symbol(symbol)
                    .candles(Collections.emptyList())
                    .build();
        } catch (Exception e) {
            log.error("캔들 데이터 조회 실패: symbol={}, interval={}, error={}", symbol, interval, e.getMessage());
            return StockCandleResponse.builder()
                    .symbol(symbol)
                    .candles(Collections.emptyList())
                    .build();
        }
    }
}
