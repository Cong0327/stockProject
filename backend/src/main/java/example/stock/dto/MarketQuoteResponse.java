package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 마켓 지수 시세 응답 DTO
 * Twelve Data /quote API 응답에서 필요한 필드만 담는다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketQuoteResponse {

    /** 종목 심볼 */
    private String symbol;

    /** 종목명 */
    private String name;

    /** 종가(현재가) */
    private Double close;

    /** 변동률(%) */
    private Double percent_change;
}
