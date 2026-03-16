package example.stock.service;

import example.stock.dto.MarketQuoteResponse;
import example.stock.dto.StockCandleResponse;
import example.stock.dto.StockSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;

/**
 * Twelve Data API 호출 서비스
 * 외부 API를 통해 종목 검색과 캔들 데이터를 조회한다.
 * 무료 티어 제한(분당 8회)을 위한 세마포어 기반 속도 제한을 적용한다.
 */
@Service
public class StockApiService {

    private static final Logger log = LoggerFactory.getLogger(StockApiService.class);

    private final WebClient webClient;

    @Value("${stock.api.key:demo}")
    private String apiKey;

    /** 무료 티어 속도 제한을 위한 세마포어 (분당 최대 8회 요청) */
    private final Semaphore rateLimiter = new Semaphore(8);

    public StockApiService(WebClient webClient) {
        this.webClient = webClient;
    }

    /**
     * 키워드로 종목을 검색한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @SuppressWarnings("unchecked")
    public Mono<List<StockSearchResponse>> searchSymbol(String keyword) {
        if (!acquireRateLimit()) {
            log.warn("속도 제한 초과: 검색 요청이 거부됨");
            return Mono.just(Collections.emptyList());
        }

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/symbol_search")
                        .queryParam("symbol", keyword)
                        .queryParam("outputsize", 10)
                        .queryParam("apikey", apiKey)
                        .build())
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    List<StockSearchResponse> results = new ArrayList<>();
                    List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
                    if (data != null) {
                        for (Map<String, Object> item : data) {
                            StockSearchResponse dto = StockSearchResponse.builder()
                                    .symbol((String) item.get("symbol"))
                                    .instrumentName((String) item.get("instrument_name"))
                                    .exchange((String) item.get("exchange"))
                                    .instrumentType((String) item.get("instrument_type"))
                                    .build();
                            results.add(dto);
                        }
                    }
                    return results;
                })
                .doFinally(signal -> releaseRateLimit())
                .onErrorResume(e -> {
                    log.error("종목 검색 API 호출 실패: keyword={}, error={}", keyword, e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    /**
     * 종목의 캔들(시계열) 데이터를 조회한다.
     *
     * @param symbol   종목 심볼
     * @param interval 시간 간격 (예: 1min, 5min, 1day)
     * @return 캔들 응답 데이터
     */
    @SuppressWarnings("unchecked")
    public Mono<StockCandleResponse> getCandles(String symbol, String interval) {
        if (!acquireRateLimit()) {
            log.warn("속도 제한 초과: 캔들 요청이 거부됨");
            return Mono.just(StockCandleResponse.builder()
                    .symbol(symbol)
                    .candles(Collections.emptyList())
                    .build());
        }

        // 분봉은 데이터를 많이 가져와야 차트가 자연스럽게 보임
        int outputSize = interval.contains("min") ? 120 : interval.contains("h") && !interval.contains("month") ? 80 : 30;

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/time_series")
                        .queryParam("symbol", symbol)
                        .queryParam("interval", interval)
                        .queryParam("outputsize", outputSize)
                        .queryParam("apikey", apiKey)
                        .build())
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    List<StockCandleResponse.CandleData> candles = new ArrayList<>();
                    List<Map<String, Object>> values = (List<Map<String, Object>>) response.get("values");
                    if (values != null) {
                        for (Map<String, Object> item : values) {
                            StockCandleResponse.CandleData candle = StockCandleResponse.CandleData.builder()
                                    .datetime((String) item.get("datetime"))
                                    .open(parseDouble(item.get("open")))
                                    .high(parseDouble(item.get("high")))
                                    .low(parseDouble(item.get("low")))
                                    .close(parseDouble(item.get("close")))
                                    .volume(parseLong(item.get("volume")))
                                    .build();
                            candles.add(candle);
                        }
                    }
                    return StockCandleResponse.builder()
                            .symbol(symbol)
                            .candles(candles)
                            .build();
                })
                .doFinally(signal -> releaseRateLimit())
                .onErrorResume(e -> {
                    log.error("캔들 데이터 API 호출 실패: symbol={}, interval={}, error={}", symbol, interval, e.getMessage());
                    return Mono.just(StockCandleResponse.builder()
                            .symbol(symbol)
                            .candles(Collections.emptyList())
                            .build());
                });
    }

    /**
     * 종목의 현재 가격을 조회한다.
     *
     * @param symbol 종목 심볼
     * @return 현재 가격
     */
    @SuppressWarnings("unchecked")
    public Mono<Double> getPrice(String symbol) {
        if (!acquireRateLimit()) {
            log.warn("속도 제한 초과: 가격 조회 요청이 거부됨");
            return Mono.empty();
        }

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/price")
                        .queryParam("symbol", symbol)
                        .queryParam("apikey", apiKey)
                        .build())
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    Object price = response.get("price");
                    return parseDouble(price);
                })
                .doFinally(signal -> releaseRateLimit())
                .onErrorResume(e -> {
                    log.error("가격 조회 API 호출 실패: symbol={}, error={}", symbol, e.getMessage());
                    return Mono.empty();
                });
    }

    /**
     * 여러 종목의 시세를 일괄 조회한다.
     * Twelve Data /quote 엔드포인트에 쉼표로 연결된 심볼을 전달하여 단일 호출로 조회한다.
     *
     * @param symbols 쉼표로 연결된 심볼 목록 (예: "IXIC,SPX,BTC/USD")
     * @return 시세 응답 목록
     */
    @SuppressWarnings("unchecked")
    public Mono<List<MarketQuoteResponse>> getQuotes(String symbols) {
        if (!acquireRateLimit()) {
            log.warn("속도 제한 초과: 시세 일괄 조회 요청이 거부됨");
            return Mono.just(Collections.emptyList());
        }

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/quote")
                        .queryParam("symbol", symbols)
                        .queryParam("apikey", apiKey)
                        .build())
                .retrieve()
                .bodyToMono(Object.class)
                .map(response -> {
                    List<MarketQuoteResponse> quotes = new ArrayList<>();

                    if (response instanceof Map) {
                        Map<String, Object> responseMap = (Map<String, Object>) response;

                        // 단일 심볼 응답: {symbol, close, percent_change, ...}
                        if (responseMap.containsKey("symbol")) {
                            quotes.add(parseQuote(responseMap));
                        } else {
                            // 다중 심볼 응답: {IXIC: {...}, SPX: {...}, ...}
                            for (Map.Entry<String, Object> entry : responseMap.entrySet()) {
                                if (entry.getValue() instanceof Map) {
                                    Map<String, Object> quoteData = (Map<String, Object>) entry.getValue();
                                    quotes.add(parseQuote(quoteData));
                                }
                            }
                        }
                    }

                    return quotes;
                })
                .doFinally(signal -> releaseRateLimit())
                .onErrorResume(e -> {
                    log.error("시세 일괄 조회 API 호출 실패: symbols={}, error={}", symbols, e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    /**
     * Twelve Data /quote 응답에서 MarketQuoteResponse를 파싱한다.
     */
    private MarketQuoteResponse parseQuote(Map<String, Object> data) {
        return MarketQuoteResponse.builder()
                .symbol((String) data.get("symbol"))
                .name((String) data.get("name"))
                .close(parseDouble(data.get("close")))
                .percent_change(parseDouble(data.get("percent_change")))
                .build();
    }

    /**
     * 속도 제한 허가를 획득한다.
     *
     * @return 허가 획득 성공 여부
     */
    private boolean acquireRateLimit() {
        boolean acquired = rateLimiter.tryAcquire();
        if (!acquired) {
            log.debug("API 속도 제한: 사용 가능한 허가 없음");
        }
        return acquired;
    }

    /**
     * 속도 제한 허가를 반환한다.
     */
    private void releaseRateLimit() {
        rateLimiter.release();
    }

    /**
     * 객체를 Double로 안전하게 변환한다.
     */
    private Double parseDouble(Object value) {
        if (value == null) return 0.0;
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    /**
     * 객체를 Long으로 안전하게 변환한다.
     */
    private Long parseLong(Object value) {
        if (value == null) return 0L;
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
