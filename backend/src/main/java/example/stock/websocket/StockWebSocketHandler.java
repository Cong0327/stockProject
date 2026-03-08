package example.stock.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import example.stock.dto.StockPriceMessage;
import example.stock.dto.WebSocketRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 주식 실시간 가격 웹소켓 핸들러
 * 클라이언트의 구독/구독 해제 요청을 처리하고, 실시간 가격을 브로드캐스트한다.
 */
@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(StockWebSocketHandler.class);

    /** 종목별 구독 세션 관리 (symbol -> 세션 집합) */
    private final Map<String, Set<WebSocketSession>> subscriptions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public StockWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * 웹소켓 연결이 수립되었을 때 호출된다.
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("웹소켓 연결 수립: sessionId={}", session.getId());
    }

    /**
     * 클라이언트로부터 텍스트 메시지를 수신했을 때 호출된다.
     * JSON 형식의 구독/구독 해제 요청을 처리한다.
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            WebSocketRequest request = objectMapper.readValue(message.getPayload(), WebSocketRequest.class);
            String type = request.getType();
            String symbol = request.getSymbol();

            if (symbol == null || symbol.isBlank()) {
                log.warn("유효하지 않은 심볼: sessionId={}", session.getId());
                return;
            }

            // 심볼을 대문자로 통일한다
            symbol = symbol.toUpperCase();

            if ("subscribe".equalsIgnoreCase(type)) {
                // 구독 처리: 세션을 해당 종목의 구독자 집합에 추가한다
                subscriptions.computeIfAbsent(symbol, k -> ConcurrentHashMap.newKeySet()).add(session);
                log.info("종목 구독: symbol={}, sessionId={}", symbol, session.getId());
            } else if ("unsubscribe".equalsIgnoreCase(type)) {
                // 구독 해제 처리: 세션을 해당 종목의 구독자 집합에서 제거한다
                Set<WebSocketSession> sessions = subscriptions.get(symbol);
                if (sessions != null) {
                    sessions.remove(session);
                    if (sessions.isEmpty()) {
                        subscriptions.remove(symbol);
                    }
                }
                log.info("종목 구독 해제: symbol={}, sessionId={}", symbol, session.getId());
            } else {
                log.warn("알 수 없는 요청 유형: type={}, sessionId={}", type, session.getId());
            }
        } catch (Exception e) {
            log.error("웹소켓 메시지 처리 실패: sessionId={}, error={}", session.getId(), e.getMessage());
        }
    }

    /**
     * 웹소켓 연결이 종료되었을 때 호출된다.
     * 해당 세션을 모든 구독 목록에서 제거한다.
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        // 모든 구독 목록에서 세션을 제거한다
        subscriptions.forEach((symbol, sessions) -> {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                subscriptions.remove(symbol);
            }
        });
        log.info("웹소켓 연결 종료: sessionId={}, status={}", session.getId(), status);
    }

    /**
     * 웹소켓 전송 오류가 발생했을 때 호출된다.
     */
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("웹소켓 전송 오류: sessionId={}, error={}", session.getId(), exception.getMessage());
        // 오류 발생 시 세션을 모든 구독에서 제거한다
        subscriptions.forEach((symbol, sessions) -> {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                subscriptions.remove(symbol);
            }
        });
    }

    /**
     * 특정 종목의 모든 구독자에게 가격 업데이트를 브로드캐스트한다.
     *
     * @param priceMessage 가격 메시지
     */
    public void broadcastPrice(StockPriceMessage priceMessage) {
        String symbol = priceMessage.getSymbol();
        Set<WebSocketSession> sessions = subscriptions.getOrDefault(symbol, Collections.emptySet());

        if (sessions.isEmpty()) {
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(priceMessage);
            TextMessage textMessage = new TextMessage(payload);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                    } catch (IOException e) {
                        log.error("메시지 전송 실패: sessionId={}, error={}", session.getId(), e.getMessage());
                        sessions.remove(session);
                    }
                } else {
                    sessions.remove(session);
                }
            }

            // 빈 세션 집합은 제거한다
            if (sessions.isEmpty()) {
                subscriptions.remove(symbol);
            }
        } catch (Exception e) {
            log.error("브로드캐스트 실패: symbol={}, error={}", symbol, e.getMessage());
        }
    }

    /**
     * 현재 구독 중인 모든 종목 심볼을 반환한다.
     *
     * @return 구독 중인 종목 심볼 집합
     */
    public Set<String> getSubscribedSymbols() {
        return Collections.unmodifiableSet(subscriptions.keySet());
    }

    /**
     * 특정 종목의 구독자 수를 반환한다.
     *
     * @param symbol 종목 심볼
     * @return 구독자 수
     */
    public int getSubscriberCount(String symbol) {
        Set<WebSocketSession> sessions = subscriptions.get(symbol);
        return sessions != null ? sessions.size() : 0;
    }
}
