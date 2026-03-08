package example.stock.websocket;

import example.stock.dto.StockPriceMessage;
import example.stock.service.StockApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * 주식 실시간 가격 스케줄러
 * 10초마다 구독 중인 종목의 최신 가격을 조회하여 웹소켓으로 브로드캐스트한다.
 */
@Component
public class StockPriceScheduler {

    private static final Logger log = LoggerFactory.getLogger(StockPriceScheduler.class);

    /** 속도 제한을 고려한 최대 동시 조회 종목 수 */
    private static final int MAX_SYMBOLS_PER_TICK = 6;

    private final StockWebSocketHandler webSocketHandler;
    private final StockApiService stockApiService;

    public StockPriceScheduler(StockWebSocketHandler webSocketHandler, StockApiService stockApiService) {
        this.webSocketHandler = webSocketHandler;
        this.stockApiService = stockApiService;
    }

    /**
     * 10초마다 구독 중인 종목의 최신 가격을 조회하고 브로드캐스트한다.
     * 활성 구독자가 없으면 조회하지 않는다.
     * 속도 제한을 위해 한 번에 최대 6개 종목만 처리한다.
     */
    @Scheduled(fixedRate = 10000)
    public void fetchAndBroadcastPrices() {
        Set<String> subscribedSymbols = webSocketHandler.getSubscribedSymbols();

        // 구독 중인 종목이 없으면 실행하지 않는다
        if (subscribedSymbols.isEmpty()) {
            return;
        }

        log.debug("가격 조회 스케줄 실행: 구독 종목 수={}", subscribedSymbols.size());

        int count = 0;
        for (String symbol : subscribedSymbols) {
            // 속도 제한을 초과하지 않도록 최대 종목 수를 제한한다
            if (count >= MAX_SYMBOLS_PER_TICK) {
                log.debug("속도 제한으로 나머지 종목은 다음 주기에 처리: 미처리 종목 수={}",
                        subscribedSymbols.size() - count);
                break;
            }

            try {
                stockApiService.getPrice(symbol)
                        .subscribe(price -> {
                            if (price != null && price > 0) {
                                StockPriceMessage message = StockPriceMessage.builder()
                                        .symbol(symbol)
                                        .price(price)
                                        .time(System.currentTimeMillis())
                                        .build();
                                webSocketHandler.broadcastPrice(message);
                                log.debug("가격 브로드캐스트 완료: symbol={}, price={}", symbol, price);
                            }
                        });
            } catch (Exception e) {
                log.error("가격 조회 및 브로드캐스트 실패: symbol={}, error={}", symbol, e.getMessage());
            }

            count++;
        }
    }
}
