package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 웹소켓 요청 DTO
 * 클라이언트가 구독/구독 해제를 요청할 때 사용한다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketRequest {

    /** 요청 유형 (subscribe, unsubscribe) */
    private String type;

    /** 종목 심볼 */
    private String symbol;
}
