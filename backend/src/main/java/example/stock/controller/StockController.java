package example.stock.controller;

import example.stock.dto.StockCandleResponse;
import example.stock.dto.StockSearchResponse;
import example.stock.service.StockService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 주식 데이터 REST 컨트롤러
 * 종목 검색과 캔들 데이터 조회 API를 제공한다.
 */
@RestController
@RequestMapping("/api/stock")
public class StockController {

    private static final Logger log = LoggerFactory.getLogger(StockController.class);

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    /**
     * 키워드로 종목을 검색한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @GetMapping("/search")
    public ResponseEntity<List<StockSearchResponse>> searchStock(
            @RequestParam String keyword) {
        log.debug("종목 검색 요청: keyword={}", keyword);
        List<StockSearchResponse> results = stockService.searchStock(keyword);
        return ResponseEntity.ok(results);
    }

    /**
     * 종목의 캔들 데이터를 조회한다.
     *
     * @param symbol   종목 심볼
     * @param interval 시간 간격 (기본값: 1day)
     * @return 캔들 응답 데이터
     */
    @GetMapping("/candles")
    public ResponseEntity<StockCandleResponse> getCandles(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1day") String interval) {
        log.debug("캔들 데이터 조회 요청: symbol={}, interval={}", symbol, interval);
        StockCandleResponse response = stockService.getCandles(symbol, interval);
        return ResponseEntity.ok(response);
    }
}
