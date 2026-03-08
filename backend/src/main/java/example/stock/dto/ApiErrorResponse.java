package example.stock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * API 에러 응답 DTO
 * 예외 발생 시 클라이언트에 반환되는 에러 정보를 담는다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiErrorResponse {

    /** HTTP 상태 코드 */
    private int status;

    /** 에러 메시지 */
    private String message;

    /** 에러 발생 시각 */
    private LocalDateTime timestamp;
}
