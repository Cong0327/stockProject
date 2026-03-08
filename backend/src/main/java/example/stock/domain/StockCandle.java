package example.stock.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 주식 캔들 데이터 엔티티
 * 종목의 시가, 고가, 저가, 종가, 거래량 정보를 저장한다.
 */
@Entity
@Table(name = "stock_candle")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockCandle {

    /** 기본 키 (자동 생성) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 종목 심볼 (예: AAPL, TSLA) */
    @Column(nullable = false)
    private String symbol;

    /** 시가 */
    @Column(name = "open_price")
    private Double open;

    /** 고가 */
    @Column(name = "high_price")
    private Double high;

    /** 저가 */
    @Column(name = "low_price")
    private Double low;

    /** 종가 */
    @Column(name = "close_price")
    private Double close;

    /** 거래량 */
    private Long volume;

    /** 일시 (문자열 형식) */
    @Column(nullable = false)
    private String datetime;
}
