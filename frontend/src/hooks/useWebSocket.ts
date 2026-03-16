import { useEffect, useRef } from 'react';
import { wsManager } from '../services/websocket';
import type { RealTimePrice } from '../services/websocket';
import { useStockStore } from '../store/stockStore';

/**
 * 웹소켓 라이프사이클을 관리하는 커스텀 훅
 * 컴포넌트 마운트 시 연결하고 언마운트 시 해제
 * 선택된 종목이 변경되면 자동으로 구독 전환
 */
export function useWebSocket(): void {
  const selectedSymbol = useStockStore((state) => state.selectedSymbol);
  const updateCurrentPrice = useStockStore((state) => state.updateCurrentPrice);
  const prevSymbolRef = useRef<string | null>(null);

  // 웹소켓 연결 초기화 및 정리
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL;

    // WS URL이 설정되지 않으면 연결하지 않음 (백엔드 미배포 시 무한 재연결 방지)
    if (!wsUrl) {
      console.log('[WS] VITE_WS_URL 미설정 — 웹소켓 비활성화');
      return;
    }

    // 실시간 가격 데이터 수신 콜백
    const handleMessage = (data: RealTimePrice) => {
      updateCurrentPrice({
        symbol: data.symbol,
        price: data.price,
        time: data.time,
      });
    };

    // 웹소켓 연결 및 메시지 핸들러 등록
    wsManager.connect(wsUrl);
    wsManager.onMessage(handleMessage);

    // 컴포넌트 언마운트 시 정리
    return () => {
      wsManager.offMessage(handleMessage);
      wsManager.disconnect();
    };
  }, [updateCurrentPrice]);

  // 선택된 종목 변경 시 구독 전환
  useEffect(() => {
    // 이전 종목 구독 해제
    if (prevSymbolRef.current && prevSymbolRef.current !== selectedSymbol) {
      wsManager.unsubscribe(prevSymbolRef.current);
    }

    // 새 종목 구독 시작
    if (selectedSymbol) {
      wsManager.subscribe(selectedSymbol);
    }

    prevSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);
}

export default useWebSocket;
