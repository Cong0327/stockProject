package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 캔들 차트 응답 DTO
 * 종목의 캔들 데이터 목록을 담는다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockCandleResponse {

    /** 종목 심볼 */
    private String symbol;

    /** 캔들 데이터 목록 */
    private List<CandleData> candles;

    /**
     * 개별 캔들 데이터
     * 시가, 고가, 저가, 종가, 거래량을 포함한다.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CandleData {

        /** 일시 */
        private String datetime;

        /** 시가 */
        private Double open;

        /** 고가 */
        private Double high;

        /** 저가 */
        private Double low;

        /** 종가 */
        private Double close;

        /** 거래량 */
        private Long volume;
    }
}
