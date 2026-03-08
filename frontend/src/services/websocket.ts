// 실시간 가격 데이터 타입 정의
export interface RealTimePrice {
  symbol: string;
  price: number;
  time: number;
}

// 웹소켓 연결 상태 타입 정의
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

// 메시지 콜백 타입 정의
type MessageCallback = (data: RealTimePrice) => void;

/**
 * 웹소켓 매니저 클래스
 * 실시간 주식 가격 데이터를 수신하기 위한 웹소켓 연결을 관리
 * 자동 재연결 기능 포함 (지수 백오프)
 */
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string = '';
  private messageCallbacks: MessageCallback[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectDelay: number = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSymbol: string | null = null;
  private _state: ConnectionState = 'disconnected';
  private shouldReconnect: boolean = false;

  // 현재 연결 상태를 반환
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * 웹소켓 서버에 연결
   * @param url 웹소켓 서버 URL
   */
  connect(url: string): void {
    this.url = url;
    this.shouldReconnect = true;
    this._state = 'connecting';
    this.createConnection();
  }

  // 웹소켓 연결 생성 (내부 메서드)
  private createConnection(): void {
    try {
      // 기존 연결이 있으면 정리
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }

      this.ws = new WebSocket(this.url);

      // 연결 성공 핸들러
      this.ws.onopen = () => {
        console.log('웹소켓 연결 성공');
        this._state = 'connected';
        this.reconnectAttempts = 0;

        // 이전에 구독한 종목이 있으면 재구독
        if (this.currentSymbol) {
          this.subscribe(this.currentSymbol);
        }
      };

      // 메시지 수신 핸들러
      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: RealTimePrice = JSON.parse(event.data);
          // 등록된 모든 콜백에 데이터 전달
          this.messageCallbacks.forEach((callback) => callback(data));
        } catch (error) {
          console.error('웹소켓 메시지 파싱 오류:', error);
        }
      };

      // 연결 종료 핸들러
      this.ws.onclose = () => {
        console.log('웹소켓 연결 종료');
        this._state = 'disconnected';

        // 재연결이 필요한 경우 지수 백오프로 재시도
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      // 에러 핸들러
      this.ws.onerror = (error) => {
        console.error('웹소켓 오류 발생:', error);
      };
    } catch (error) {
      console.error('웹소켓 연결 생성 실패:', error);
      this._state = 'disconnected';

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 지수 백오프를 적용한 재연결 스케줄링
   * 1초 -> 2초 -> 4초 -> ... -> 최대 30초
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`${delay / 1000}초 후 재연결 시도... (시도 횟수: ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this._state = 'connecting';
      this.createConnection();
    }, delay);
  }

  /**
   * 특정 종목의 실시간 데이터를 구독
   * @param symbol 종목 심볼
   */
  subscribe(symbol: string): void {
    this.currentSymbol = symbol;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 구독 메시지 전송
      const message = JSON.stringify({
        type: 'subscribe',
        symbol: symbol,
      });
      this.ws.send(message);
      console.log(`종목 구독 시작: ${symbol}`);
    }
  }

  /**
   * 특정 종목의 실시간 데이터 구독 해제
   * @param symbol 종목 심볼
   */
  unsubscribe(symbol: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol,
      });
      this.ws.send(message);
      console.log(`종목 구독 해제: ${symbol}`);
    }

    if (this.currentSymbol === symbol) {
      this.currentSymbol = null;
    }
  }

  /**
   * 메시지 수신 콜백 등록
   * @param callback 실시간 가격 데이터를 받을 콜백 함수
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * 메시지 수신 콜백 제거
   * @param callback 제거할 콜백 함수
   */
  offMessage(callback: MessageCallback): void {
    this.messageCallbacks = this.messageCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * 웹소켓 연결 종료 및 정리
   */
  disconnect(): void {
    this.shouldReconnect = false;

    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 웹소켓 연결 종료
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this._state = 'disconnected';
    this.currentSymbol = null;
    this.reconnectAttempts = 0;
    console.log('웹소켓 연결 해제 완료');
  }
}

// 싱글턴 인스턴스 내보내기
export const wsManager = new WebSocketManager();
export default wsManager;
