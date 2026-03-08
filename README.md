# 실시간 주식 차트 (Real-time Stock Chart)

실시간 주식 가격을 차트로 표시하는 풀스택 웹 애플리케이션입니다.
WebSocket을 통해 실시간 가격 업데이트를 받고, TradingView Lightweight Charts로 캔들스틱 차트를 렌더링합니다.

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 프레임워크 |
| Vite 5 | 빌드 도구 |
| TypeScript | 타입 안전성 |
| Axios | HTTP 클라이언트 |
| TradingView Lightweight Charts | 차트 렌더링 |
| Zustand | 상태 관리 |

### Backend
| 기술 | 용도 |
|------|------|
| Java 17 | 런타임 |
| Spring Boot 3.2 | 웹 프레임워크 |
| Gradle | 빌드 도구 |
| Spring WebSocket | 실시간 통신 |
| Spring Data JPA | 데이터 접근 |
| Spring WebFlux (WebClient) | 외부 API 호출 |
| Redis | 캐시 |
| H2 | 개발용 데이터베이스 |
| Lombok | 보일러플레이트 제거 |

### Infra
| 기술 | 용도 |
|------|------|
| Docker | 컨테이너 |
| Docker Compose | 멀티 컨테이너 오케스트레이션 |
| Nginx | 프론트엔드 서빙 & 리버스 프록시 |

---

## 프로젝트 구조

```
StockPage/
├── backend/
│   ├── src/main/java/example/stock/
│   │   ├── config/          # 설정 (Redis, WebSocket, CORS, WebClient)
│   │   ├── controller/      # REST 컨트롤러
│   │   ├── service/         # 비즈니스 로직
│   │   ├── repository/      # 데이터 접근
│   │   ├── dto/             # 데이터 전송 객체
│   │   ├── domain/          # 엔티티
│   │   ├── websocket/       # WebSocket 핸들러 & 스케줄러
│   │   └── cache/           # Redis 캐시 서비스
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── build.gradle
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React 컴포넌트
│   │   ├── services/        # API 클라이언트 & WebSocket
│   │   ├── store/           # Zustand 상태 관리
│   │   ├── pages/           # 페이지 컴포넌트
│   │   └── hooks/           # 커스텀 훅
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 무료 API Key 발급 방법

이 프로젝트는 **Twelve Data** API를 사용합니다.

### 발급 절차

1. [Twelve Data](https://twelvedata.com) 사이트 접속
2. **Sign Up** 클릭하여 회원가입
3. 이메일 인증 완료
4. Dashboard에서 **API Key** 확인
5. 프로젝트 루트의 `.env` 파일에 키 입력

```env
STOCK_API_KEY=your_api_key_here
```

### 무료 플랜 제한사항

- 분당 8회 API 호출
- 일 800회 API 호출
- 실시간 데이터 지원

> **참고**: `demo` 키로도 제한적으로 테스트 가능합니다.

---

## 개발 실행 방법

### 사전 요구사항

- Java 17+
- Node.js 18+
- Redis (로컬 또는 Docker)

### Backend 실행

```bash
cd backend

# API Key 환경 변수 설정
export STOCK_API_KEY=your_api_key

# Redis 실행 (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# 빌드 및 실행
./gradlew bootRun
```

Backend: http://localhost:8080

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Docker 실행 방법

### 사전 요구사항

- Docker
- Docker Compose

### 실행

```bash
# 1. API Key 설정 (.env 파일 수정)
echo "STOCK_API_KEY=your_api_key" > .env

# 2. 빌드 및 실행
docker compose up --build

# 3. 백그라운드 실행
docker compose up --build -d
```

### 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api |
| H2 Console | http://localhost:8080/h2-console |

### 종료

```bash
docker compose down
```

---

## API 엔드포인트

### REST API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/stock/search?keyword=AAPL` | 주식 심볼 검색 |
| GET | `/api/stock/candles?symbol=AAPL&interval=1day` | 캔들 데이터 조회 |

### WebSocket

| Endpoint | 설명 |
|----------|------|
| `ws://localhost:8080/ws/stock` | 실시간 가격 구독 |

#### 구독 메시지

```json
{
  "type": "subscribe",
  "symbol": "AAPL"
}
```

#### 가격 업데이트 메시지

```json
{
  "symbol": "AAPL",
  "price": 182.23,
  "time": 1710000000
}
```

---

## 주요 기능

- **주식 심볼 검색**: 키워드로 주식 심볼을 검색합니다
- **캔들스틱 차트**: TradingView Lightweight Charts 기반 차트
- **실시간 업데이트**: WebSocket을 통한 실시간 가격 반영
- **Redis 캐싱**: 5분 TTL로 API 응답 캐싱
- **Rate Limit 대응**: 외부 API 호출 제한 자동 관리
- **자동 재연결**: WebSocket 연결 끊김 시 지수 백오프로 재연결
