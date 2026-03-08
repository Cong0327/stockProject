package example.stock.repository;

import example.stock.domain.StockCandle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 주식 캔들 데이터 리포지토리
 * StockCandle 엔티티에 대한 데이터 접근을 제공한다.
 */
@Repository
public interface StockCandleRepository extends JpaRepository<StockCandle, Long> {

    /**
     * 종목 심볼로 캔들 데이터를 일시 역순으로 조회한다.
     *
     * @param symbol 종목 심볼
     * @return 캔들 데이터 목록 (최신순)
     */
    List<StockCandle> findBySymbolOrderByDatetimeDesc(String symbol);
}
