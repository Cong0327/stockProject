package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 웹소켓 실시간 가격 메시지 DTO
 * 구독자에게 전송되는 실시간 주가 정보를 담는다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockPriceMessage {

    /** 종목 심볼 */
    private String symbol;

    /** 현재 가격 */
    private Double price;

    /** 시간 (밀리초 타임스탬프) */
    private Long time;
}
