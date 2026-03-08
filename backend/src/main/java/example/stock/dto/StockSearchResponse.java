package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 종목 검색 응답 DTO
 * Twelve Data API의 심볼 검색 결과를 담는다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockSearchResponse {

    /** 종목 심볼 */
    private String symbol;

    /** 종목명 */
    private String instrumentName;

    /** 거래소 */
    private String exchange;

    /** 종목 유형 (주식, ETF 등) */
    private String instrumentType;
}
