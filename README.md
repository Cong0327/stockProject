# Stock Dashboard

실시간 주식 가격을 TradingView 스타일 다크모드 UI로 표시하는 풀스택 웹 애플리케이션입니다.
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
| Inter Font | 가독성 높은 산세리프 폰트 |

### Backend
| 기술 | 용도 |
|------|------|
| Java 17 | 런타임 |
| Spring Boot 3.2 | 웹 프레임워크 |
| Gradle | 빌드 도구 |
| Spring WebSocket | 실시간 통신 |
| Spring Data JPA | 데이터 접근 |
| Spring WebFlux (WebClient) | 외부 API 호출 |
| Redis | 캐시 (미연결 시 인메모리 폴백) |
| H2 | 개발용 데이터베이스 |
| Lombok | 보일러플레이트 제거 |

### Infra / 배포
| 기술 | 용도 |
|------|------|
| Vercel | 프론트엔드 배포 |
| Railway | 백엔드 + Redis 배포 |
| Docker / Docker Compose | 로컬 개발 환경 |

---

## 프로젝트 구조

```
stockProject/
├── backend/
│   ├── src/main/java/example/stock/
│   │   ├── config/          # 설정 (Redis, WebSocket, CORS, WebClient)
│   │   ├── controller/      # REST 컨트롤러
│   │   ├── service/         # 비즈니스 로직 & Twelve Data API 연동
│   │   ├── repository/      # 데이터 접근
│   │   ├── dto/             # 데이터 전송 객체
│   │   ├── domain/          # 엔티티
│   │   ├── websocket/       # WebSocket 핸들러 & 스케줄러
│   │   └── cache/           # Redis 캐시 서비스
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── build.gradle
│   ├── Dockerfile           # Railway 배포용 (루트 컨텍스트)
│   └── Dockerfile.local     # 로컬 docker-compose용
├── frontend/
│   ├── src/
│   │   ├── components/      # React 컴포넌트 (StockChart, StockSearch, MarketBadges 등)
│   │   ├── services/        # API 클라이언트, WebSocket, localStorage 캐시
│   │   ├── store/           # Zustand 상태 관리
│   │   ├── pages/           # 페이지 컴포넌트
│   │   └── hooks/           # 커스텀 훅 (useWebSocket)
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml       # 로컬 개발용
├── vercel.json              # Vercel 배포 설정
├── railway.toml             # Railway 배포 설정
└── README.md
```

---

## 배포 환경 구성

### 아키텍처

```
[Vercel - Frontend]  ──REST──>  [Railway - Backend]  ──API──>  [Twelve Data API]
        │                             │
        └──WebSocket──>               └──Cache──>  [Railway - Redis]
```

### Vercel 환경변수 (프론트엔드)

| 변수명 | 예시 값 | 설명 |
|--------|---------|------|
| `VITE_API_BASE_URL` | `https://your-app.up.railway.app/api` | Railway 백엔드 REST API 주소 |
| `VITE_WS_URL` | `wss://your-app.up.railway.app/ws/stock` | Railway 백엔드 WebSocket 주소 |

> Vite는 빌드 타임에 환경변수를 주입하므로, 변경 후 반드시 **Redeploy** 필요

### Railway 환경변수 (백엔드)

| 변수명 | 예시 값 | 필수 | 설명 |
|--------|---------|------|------|
| `STOCK_API_KEY` | Twelve Data API 키 | O | 주식 데이터 API 인증키 |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` | O | Vercel 프론트엔드 도메인 (쉼표 구분 가능) |
| `REDIS_URL` | Redis 공개 URL | O | `redis://default:pass@host:port` 형태 |
| `REDIS_HOST` | Redis 추가 시 자동 | X | REDIS_URL 사용 시 불필요 |
| `REDIS_PORT` | Redis 추가 시 자동 | X | REDIS_URL 사용 시 불필요 |
| `REDIS_PASSWORD` | Redis 추가 시 자동 | X | REDIS_URL 사용 시 불필요 |

> `PORT`는 Railway가 자동 주입하므로 설정 불필요

### Railway 배포 체크리스트

1. GitHub 연결 후 프로젝트 생성
2. **Root Directory는 비워두기** (`railway.toml`이 루트에서 경로 지정)
3. 환경변수 설정 (`STOCK_API_KEY`, `CORS_ALLOWED_ORIGINS`)
4. Redis 서비스 추가: **New > Database > Redis**
5. Redis **공개(Public) URL**을 `REDIS_URL`로 설정 (내부 URL은 DNS 해석 안 될 수 있음)
6. 도메인 생성: **Settings > Networking > Generate Domain**
7. 생성된 도메인을 Vercel 환경변수에 반영

---

## Docker 로컬 실행 (Dockerfile.local 사용)

### 사전 요구사항

- Docker
- Docker Compose

### 실행

```bash
# 1. API Key 설정
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

### 종료

```bash
docker compose down
```

---

## 로컬 개발 실행 (Docker 없이)

### 사전 요구사항

- Java 17+
- Node.js 18+
- Redis (선택 — 없으면 인메모리 캐시로 동작)

### Backend

```bash
cd backend
export STOCK_API_KEY=your_api_key
./gradlew bootRun
```

Backend: http://localhost:8080

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

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

> `demo` 키로도 제한적으로 테스트 가능합니다.

---

## API 엔드포인트

### REST API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/stock/search?keyword=AAPL` | 주식 심볼 검색 |
| GET | `/api/stock/candles?symbol=AAPL&interval=1day` | 캔들 데이터 조회 |
| GET | `/api/stock/quotes?symbols=QQQ,SPY,BTC/USD` | 마켓 지수 일괄 조회 |

### WebSocket

| Endpoint | 설명 |
|----------|------|
| `ws://localhost:8080/ws/stock` | 실시간 가격 구독 |

#### 구독 메시지

```json
{ "type": "subscribe", "symbol": "AAPL" }
```

#### 가격 업데이트 메시지

```json
{ "symbol": "AAPL", "price": 182.23, "time": 1710000000 }
```

---

## 주요 기능

- **TradingView 스타일 다크모드 UI**: Glassmorphism, Inter 폰트, 에메랄드/로즈 상승·하락 컬러
- **캔들스틱 차트**: 1분/5분/60분/일/주/월봉 지원
- **마켓 지수 배지**: QQQ, SPY, BTC/USD, ETH/USD, GLD 실시간 표시
- **실시간 업데이트**: WebSocket을 통한 실시간 가격 반영
- **다중 캐싱**: 프론트(localStorage 60초 TTL) + 백엔드(Redis 5분 TTL)
- **API 할당량 보호**: Twelve Data 무료 플랜(분당 8회)에 맞춘 캐싱 및 배치 호출
- **429 에러 핸들링**: Rate Limit 초과 시 스테일 캐시 폴백 + UI 알림
- **WebSocket 안전 연결**: 환경변수 미설정 시 비활성화, 재연결 최대 5회 제한
