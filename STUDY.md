# Stock Project - Backend 학습 가이드

> PHP 개발자를 위한 Java + Spring Boot 학습 자료
> 이 프로젝트의 실제 코드를 기반으로 Java/Spring Boot/REST API 개념을 설명합니다.

---

## 목차

1. [PHP vs Java 핵심 차이점](#1-php-vs-java-핵심-차이점)
2. [프로젝트 구조 이해하기](#2-프로젝트-구조-이해하기)
3. [Spring Boot 핵심 개념](#3-spring-boot-핵심-개념)
4. [어노테이션 (Annotation) 총정리](#4-어노테이션-annotation-총정리)
5. [REST API 설계와 Controller](#5-rest-api-설계와-controller)
6. [Service 계층과 비즈니스 로직](#6-service-계층과-비즈니스-로직)
7. [외부 API 호출 (WebClient)](#7-외부-api-호출-webclient)
8. [JPA와 데이터베이스](#8-jpa와-데이터베이스)
9. [캐싱 (Redis)](#9-캐싱-redis)
10. [WebSocket 실시간 통신](#10-websocket-실시간-통신)
11. [예외 처리](#11-예외-처리)
12. [설정 관리 (application.yml)](#12-설정-관리-applicationyml)
13. [Lombok 라이브러리](#13-lombok-라이브러리)
14. [리액티브 프로그래밍 기초 (Mono/Flux)](#14-리액티브-프로그래밍-기초-monoflux)
15. [동시성 처리](#15-동시성-처리)
16. [빌드와 의존성 관리 (Gradle)](#16-빌드와-의존성-관리-gradle)
17. [실습 과제](#17-실습-과제)

---

## 1. PHP vs Java 핵심 차이점

### 타입 시스템

```php
// PHP: 동적 타입 (타입 힌트는 선택사항)
function getPrice($symbol) {
    return 182.5;  // 어떤 타입이든 반환 가능
}
$price = getPrice("AAPL");
```

```java
// Java: 정적 타입 (모든 변수에 타입 필수)
public Double getPrice(String symbol) {
    return 182.5;  // 반드시 Double만 반환
}
Double price = getPrice("AAPL");
```

**핵심 차이**: Java는 컴파일 시점에 타입 오류를 잡아낸다. PHP처럼 런타임에서 "undefined" 에러를 만날 일이 줄어든다.

### 실행 방식

| 구분 | PHP | Java (Spring Boot) |
|------|-----|---------------------|
| 실행 | 요청마다 스크립트 실행 후 종료 | 서버가 계속 실행 (상주 프로세스) |
| 상태 | 요청 간 상태 공유 불가 | 메모리에 상태 유지 가능 |
| 진입점 | `index.php` 등 직접 접근 | `main()` 메서드에서 서버 시작 |
| 패키지 관리 | Composer (`composer.json`) | Gradle (`build.gradle`) 또는 Maven |

### 접근 제한자

```php
// PHP
class StockService {
    private $apiKey;           // $가 필수
    public function search() {} // function 키워드 사용
}
```

```java
// Java
public class StockService {
    private String apiKey;            // $없음, 타입 명시
    public List<String> search() {}   // 반환 타입 명시, function 키워드 없음
}
```

### Null 처리

```php
// PHP: null이 자유롭게 흘러다님
$result = getResults();
echo count($result);  // $result가 null이면 Warning
```

```java
// Java: Optional로 null을 명시적으로 처리
// 이 프로젝트의 StockCacheService.java에서 사용
Optional<StockCandleResponse> cached = cacheService.getCachedCandles(symbol, interval);
if (cached.isPresent()) {
    return cached.get();  // 값이 있을 때만 꺼냄
}
```

### 컬렉션 (배열)

```php
// PHP: 배열이 만능
$results = [];                    // 빈 배열
$results[] = $item;               // 추가
$map = ['key' => 'value'];       // 연관 배열
```

```java
// Java: 용도별로 다른 컬렉션
List<String> results = new ArrayList<>();   // 순서 있는 목록
results.add(item);                          // 추가
Map<String, String> map = new HashMap<>();  // 키-값 쌍
Set<String> unique = new HashSet<>();       // 중복 없는 집합
```

이 프로젝트에서 `List`, `Map`, `Set` 모두 사용된다:
- `List<StockSearchResponse>` — 검색 결과 목록
- `Map<String, Set<WebSocketSession>>` — 종목별 구독 세션 관리
- `Set<String>` — 구독 중인 종목 심볼 집합

---

## 2. 프로젝트 구조 이해하기

### PHP (Laravel) vs Spring Boot 디렉토리 비교

```
Laravel                          Spring Boot (이 프로젝트)
─────────────────────────────    ─────────────────────────────────────
app/Http/Controllers/            controller/     ← HTTP 요청 처리
app/Services/                    service/        ← 비즈니스 로직
app/Models/                      domain/         ← 데이터베이스 엔티티
app/Http/Resources/              dto/            ← 데이터 전송 객체
app/Repositories/                repository/     ← DB 접근 계층
config/                          config/         ← 설정 클래스
routes/api.php                   @RequestMapping ← 라우팅 (어노테이션)
.env                             application.yml ← 환경 설정
```

### 이 프로젝트의 백엔드 구조

```
backend/src/main/java/example/stock/
├── StockApplication.java          # 메인 진입점 (@SpringBootApplication)
├── config/                        # 설정 빈
│   ├── WebClientConfig.java       # HTTP 클라이언트 설정
│   ├── RedisConfig.java           # Redis 캐시 설정
│   ├── WebSocketConfig.java       # WebSocket 엔드포인트 설정
│   └── CorsConfig.java            # CORS 설정
├── controller/                    # REST API 엔드포인트
│   ├── StockController.java       # /api/stock/** 라우팅
│   └── GlobalExceptionHandler.java# 전역 예외 처리
├── service/                       # 비즈니스 로직
│   ├── StockService.java          # 캐시 확인 → API 호출 오케스트레이션
│   └── StockApiService.java       # Twelve Data API 호출
├── repository/                    # DB 접근
│   └── StockCandleRepository.java # JPA 쿼리
├── domain/                        # 엔티티 (DB 테이블 매핑)
│   └── StockCandle.java           # stock_candle 테이블
├── dto/                           # 요청/응답 객체
│   ├── StockSearchResponse.java
│   ├── StockCandleResponse.java
│   ├── MarketQuoteResponse.java
│   └── ...
├── websocket/                     # 실시간 통신
│   ├── StockWebSocketHandler.java # WebSocket 메시지 처리
│   └── StockPriceScheduler.java   # 10초마다 가격 브로드캐스트
└── cache/
    └── StockCacheService.java     # Redis 캐시 서비스
```

### 데이터 흐름 (요청 → 응답)

```
클라이언트 요청
    ↓
[StockController]     — HTTP 요청 수신, 파라미터 파싱
    ↓
[StockService]        — 캐시 확인 → 캐시 미스 시 API 호출
    ↓
[StockApiService]     — Twelve Data 외부 API 호출 (WebClient)
    ↓
[StockCacheService]   — 결과를 Redis에 캐싱
    ↓
[StockController]     — ResponseEntity로 JSON 응답 반환
    ↓
클라이언트 응답 (JSON)
```

PHP에서는 이런 흐름을 `Route → Controller → Service → Model` 패턴으로 구현했을 것이다. Spring Boot도 동일한 계층 분리 원칙을 따르지만, **의존성 주입(DI)**으로 각 계층을 연결한다.

---

## 3. Spring Boot 핵심 개념

### 3.1 의존성 주입 (Dependency Injection)

PHP에서는 직접 객체를 생성하거나 Laravel의 서비스 컨테이너를 사용한다:

```php
// PHP (직접 생성)
class StockController {
    private $stockService;

    public function __construct() {
        $this->stockService = new StockService();  // 직접 생성
    }
}

// PHP (Laravel DI)
class StockController {
    public function __construct(private StockService $stockService) {}  // 컨테이너가 주입
}
```

Spring Boot에서는 **생성자 주입**이 표준이다:

```java
// 이 프로젝트의 StockController.java
@RestController
@RequestMapping("/api/stock")
public class StockController {

    private final StockService stockService;  // final: 한번 할당 후 변경 불가

    // Spring이 StockService 빈을 찾아서 자동 주입한다
    public StockController(StockService stockService) {
        this.stockService = stockService;
    }
}
```

**동작 원리**:
1. Spring이 앱 시작 시 `@Service`, `@Component`, `@Configuration` 등이 붙은 클래스를 스캔한다
2. 각 클래스의 인스턴스(빈)를 생성한다
3. 생성자의 파라미터 타입을 보고, 일치하는 빈을 자동으로 주입한다

`StockService`에는 `@Service`가 붙어 있으므로 Spring이 자동으로 빈을 만들고, `StockController`의 생성자에 넣어준다.

### 3.2 빈 (Bean) 이란?

Spring이 관리하는 객체를 **빈(Bean)**이라고 한다. PHP의 서비스 컨테이너에 등록된 서비스와 같은 개념이다.

빈을 등록하는 두 가지 방법:

```java
// 방법 1: 클래스에 어노테이션 붙이기 (자동 등록)
@Service
public class StockService { ... }

// 방법 2: @Configuration 클래스에서 @Bean 메서드로 등록 (수동 등록)
// 이 프로젝트의 WebClientConfig.java
@Configuration
public class WebClientConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}
```

방법 2는 **외부 라이브러리 클래스**처럼 직접 어노테이션을 붙일 수 없는 경우에 사용한다. `WebClient`는 Spring 라이브러리 클래스이므로, `@Bean` 메서드로 설정을 커스터마이징해서 등록한다.

### 3.3 싱글톤 스코프

Spring 빈은 기본적으로 **싱글톤**이다. 앱 전체에서 인스턴스가 하나만 만들어진다.

```java
// StockApiService 빈은 앱에 딱 하나만 존재
// StockService와 StockPriceScheduler 둘 다 같은 인스턴스를 주입받음
@Service
public class StockApiService { ... }
```

PHP에서는 요청마다 객체가 새로 생성되지만, Spring Boot에서는 서버가 계속 떠 있으므로 빈이 재사용된다. 이 때문에 **빈에 상태(state)를 저장할 때 스레드 안전성**을 고려해야 한다 (15장에서 설명).

---

## 4. 어노테이션 (Annotation) 총정리

PHP 8의 Attribute(`#[Route('/api')]`)와 비슷하지만, Java 어노테이션은 훨씬 더 광범위하게 사용된다.

### 이 프로젝트에서 사용된 어노테이션

#### Spring 핵심

| 어노테이션 | PHP 대응 | 설명 | 사용 위치 |
|------------|----------|------|-----------|
| `@SpringBootApplication` | - | 앱 시작점. 컴포넌트 스캔 + 자동 설정 활성화 | `StockApplication.java` |
| `@EnableScheduling` | - | 스케줄러(`@Scheduled`) 활성화 | `StockApplication.java` |
| `@EnableCaching` | - | 캐싱 기능 활성화 | `RedisConfig.java` |

#### 빈 등록

| 어노테이션 | 역할 | 사용 위치 |
|------------|------|-----------|
| `@Configuration` | 설정 클래스 (빈 정의용) | `WebClientConfig`, `RedisConfig` 등 |
| `@Bean` | 메서드 반환 객체를 빈으로 등록 | 설정 클래스 내 메서드 |
| `@Component` | 범용 빈 등록 | `StockWebSocketHandler` |
| `@Service` | 비즈니스 로직 빈 (Component의 특수화) | `StockService`, `StockApiService` |
| `@RestController` | REST API 컨트롤러 빈 | `StockController` |
| `@Primary` | 같은 타입 빈이 여러 개일 때 우선 선택 | `RedisConfig.cacheManager()` |

> `@Component`, `@Service`, `@RestController`는 모두 빈을 등록한다. 기능적 차이는 없지만, **의도를 명확히** 하기 위해 역할에 맞게 사용한다.

#### 웹/API

| 어노테이션 | PHP 대응 | 설명 |
|------------|----------|------|
| `@RestController` | `class Controller` | JSON 응답을 반환하는 컨트롤러 |
| `@RequestMapping("/api/stock")` | `Route::prefix('/api/stock')` | URL 접두어 설정 |
| `@GetMapping("/search")` | `Route::get('/search', ...)` | GET 요청 매핑 |
| `@RequestParam` | `$request->query('keyword')` | 쿼리 파라미터 바인딩 |
| `@RestControllerAdvice` | `Handler::render()` | 전역 예외 처리기 |
| `@ExceptionHandler` | `catch` | 특정 예외 타입 처리 |

#### JPA/데이터

| 어노테이션 | PHP 대응 (Eloquent) | 설명 |
|------------|---------------------|------|
| `@Entity` | `extends Model` | DB 테이블에 매핑되는 클래스 |
| `@Table(name = "stock_candle")` | `$table = 'stock_candle'` | 테이블 이름 지정 |
| `@Id` | `$primaryKey` | 기본 키 지정 |
| `@GeneratedValue` | `$incrementing = true` | 자동 증가 전략 |
| `@Column(nullable = false)` | 마이그레이션의 `->nullable(false)` | 컬럼 속성 지정 |

#### 기타

| 어노테이션 | 설명 | 사용 위치 |
|------------|------|-----------|
| `@Value("${stock.api.key}")` | `env('STOCK_API_KEY')` | `application.yml`의 값 주입 |
| `@Scheduled(fixedRate = 10000)` | 10초마다 메서드 실행 | `StockPriceScheduler` |
| `@SuppressWarnings("unchecked")` | 컴파일 경고 억제 | `StockApiService` |

#### Lombok (코드 생성)

| 어노테이션 | 자동 생성되는 코드 |
|------------|-------------------|
| `@Data` | getter, setter, toString, equals, hashCode |
| `@Builder` | 빌더 패턴 (`.builder().symbol("AAPL").build()`) |
| `@NoArgsConstructor` | 기본 생성자 |
| `@AllArgsConstructor` | 모든 필드를 받는 생성자 |

---

## 5. REST API 설계와 Controller

### StockController 분석

```java
// backend/src/main/java/example/stock/controller/StockController.java

@RestController                    // ① 이 클래스는 REST 컨트롤러다
@RequestMapping("/api/stock")      // ② 모든 엔드포인트의 접두어: /api/stock
public class StockController {

    private final StockService stockService;

    // ③ 생성자 주입
    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    // ④ GET /api/stock/search?keyword=AAPL
    @GetMapping("/search")
    public ResponseEntity<List<StockSearchResponse>> searchStock(
            @RequestParam String keyword) {          // ⑤ 쿼리 파라미터 바인딩
        List<StockSearchResponse> results = stockService.searchStock(keyword);
        return ResponseEntity.ok(results);           // ⑥ 200 OK + JSON 응답
    }

    // GET /api/stock/candles?symbol=AAPL&interval=1day
    @GetMapping("/candles")
    public ResponseEntity<StockCandleResponse> getCandles(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1day") String interval) {  // ⑦ 기본값
        StockCandleResponse response = stockService.getCandles(symbol, interval);
        return ResponseEntity.ok(response);
    }
}
```

PHP Laravel과의 비교:

```php
// PHP Laravel 동등한 코드
Route::prefix('/api/stock')->group(function () {
    Route::get('/search', [StockController::class, 'searchStock']);
    Route::get('/candles', [StockController::class, 'getCandles']);
});

class StockController extends Controller {
    public function searchStock(Request $request) {
        $keyword = $request->query('keyword');  // Java의 @RequestParam
        $results = $this->stockService->searchStock($keyword);
        return response()->json($results);      // Java의 ResponseEntity.ok()
    }
}
```

### ResponseEntity 이해하기

`ResponseEntity`는 HTTP 응답 전체(상태 코드 + 헤더 + 바디)를 제어할 수 있다:

```java
// 200 OK
return ResponseEntity.ok(data);

// 201 Created
return ResponseEntity.status(HttpStatus.CREATED).body(data);

// 404 Not Found
return ResponseEntity.notFound().build();

// 400 Bad Request + 에러 메시지
return ResponseEntity.badRequest().body(errorResponse);
```

### 이 프로젝트의 API 목록

| 메서드 | URL | 파라미터 | 설명 |
|--------|-----|---------|------|
| GET | `/api/stock/search` | `keyword` (필수) | 종목 검색 |
| GET | `/api/stock/candles` | `symbol` (필수), `interval` (기본: 1day) | 캔들 데이터 |
| GET | `/api/stock/quotes` | `symbols` (필수, 쉼표 구분) | 시세 일괄 조회 |

---

## 6. Service 계층과 비즈니스 로직

### StockService: 캐시 우선 전략 (Cache-Aside 패턴)

```java
// backend/src/main/java/example/stock/service/StockService.java

@Service
public class StockService {

    private final StockCacheService cacheService;
    private final StockApiService apiService;

    // 의존성 2개를 주입받음: 캐시 서비스 + API 서비스
    public StockService(StockCacheService cacheService, StockApiService apiService) {
        this.cacheService = cacheService;
        this.apiService = apiService;
    }

    public List<StockSearchResponse> searchStock(String keyword) {
        // 1단계: 캐시 확인
        Optional<List<StockSearchResponse>> cached = cacheService.getCachedSearchResult(keyword);
        if (cached.isPresent()) {
            return cached.get();          // 캐시 적중 → 바로 반환
        }

        // 2단계: 캐시 미스 → API 호출
        try {
            List<StockSearchResponse> results = apiService.searchSymbol(keyword).block();
            // 3단계: 결과 캐싱
            if (results != null && !results.isEmpty()) {
                cacheService.cacheSearchResult(keyword, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();  // 실패 시 빈 리스트
        }
    }
}
```

**Cache-Aside 패턴 흐름**:
```
요청 → 캐시 확인 → [있으면] → 반환
                   [없으면] → API 호출 → 결과 캐싱 → 반환
```

### PHP와 비교

```php
// PHP에서 동일한 패턴
class StockService {
    public function searchStock(string $keyword): array {
        // Redis 캐시 확인
        $cached = Cache::get("stock:search:{$keyword}");
        if ($cached) {
            return $cached;
        }

        // API 호출
        $results = $this->apiService->searchSymbol($keyword);
        Cache::put("stock:search:{$keyword}", $results, 300);
        return $results;
    }
}
```

Java 버전이 더 장황하지만, `Optional`을 통해 null 안전성이 보장되고, 타입 시스템 덕분에 IDE 자동완성이 정확하다.

### .block()이란?

```java
List<StockSearchResponse> results = apiService.searchSymbol(keyword).block();
```

`apiService.searchSymbol()`은 `Mono<List<StockSearchResponse>>`를 반환한다 (비동기 결과). `.block()`은 결과가 올 때까지 현재 스레드를 **블로킹**하여 동기식으로 만든다. PHP에서 HTTP 요청을 보내고 응답을 기다리는 것과 같다 (14장에서 자세히 설명).

---

## 7. 외부 API 호출 (WebClient)

### PHP의 HTTP 클라이언트 vs Java의 WebClient

```php
// PHP: Guzzle
$response = Http::get('https://api.twelvedata.com/symbol_search', [
    'symbol' => $keyword,
    'apikey' => $apiKey,
]);
$data = $response->json()['data'];
```

```java
// Java: WebClient (이 프로젝트의 StockApiService.java)
return webClient.get()
        .uri(uriBuilder -> uriBuilder
                .path("/symbol_search")
                .queryParam("symbol", keyword)
                .queryParam("outputsize", 10)
                .queryParam("apikey", apiKey)
                .build())
        .retrieve()
        .bodyToMono(Map.class)     // JSON → Map으로 변환
        .map(response -> {         // Map을 DTO 리스트로 변환
            List<StockSearchResponse> results = new ArrayList<>();
            List<Map<String, Object>> data =
                (List<Map<String, Object>>) response.get("data");
            if (data != null) {
                for (Map<String, Object> item : data) {
                    StockSearchResponse dto = StockSearchResponse.builder()
                            .symbol((String) item.get("symbol"))
                            .instrumentName((String) item.get("instrument_name"))
                            .build();
                    results.add(dto);
                }
            }
            return results;
        });
```

### WebClient 설정 (빈 등록)

```java
// backend/src/main/java/example/stock/config/WebClientConfig.java

@Configuration
public class WebClientConfig {

    @Value("${stock.api.base-url:https://api.twelvedata.com}")
    private String baseUrl;    // application.yml에서 값을 가져옴

    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)    // 기본 URL 설정 → 이후 .path()만 지정하면 됨
                .build();
    }
}
```

PHP의 Guzzle 기본 설정과 동일한 역할:
```php
$client = new Client(['base_uri' => 'https://api.twelvedata.com']);
```

### WebClient 체이닝 메서드 설명

```java
webClient.get()                    // GET 요청
    .uri(uriBuilder -> ...)        // URL + 쿼리 파라미터 조합
    .retrieve()                    // 응답 수신 시작
    .bodyToMono(Map.class)         // 응답 바디를 Map으로 역직렬화
    .map(response -> ...)          // 응답 데이터 변환 (map = 변환 함수)
    .doFinally(signal -> ...)      // 성공/실패 관계없이 마지막에 실행
    .onErrorResume(e -> ...)       // 에러 발생 시 대체 값 반환
```

---

## 8. JPA와 데이터베이스

### Entity: DB 테이블과 Java 클래스 매핑

```java
// backend/src/main/java/example/stock/domain/StockCandle.java

@Entity                              // 이 클래스는 DB 테이블에 매핑된다
@Table(name = "stock_candle")        // 테이블 이름: stock_candle
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StockCandle {

    @Id                              // 기본 키
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // AUTO_INCREMENT
    private Long id;

    @Column(nullable = false)        // NOT NULL 제약
    private String symbol;

    @Column(name = "open_price")     // 컬럼명이 필드명과 다를 때
    private Double open;             // 'open'은 SQL 예약어이므로 open_price로

    @Column(name = "high_price")
    private Double high;

    @Column(name = "low_price")
    private Double low;

    @Column(name = "close_price")
    private Double close;

    private Long volume;             // @Column 생략 시 필드명 = 컬럼명

    @Column(nullable = false)
    private String datetime;
}
```

PHP Eloquent와 비교:

```php
// PHP: 마이그레이션으로 테이블 정의, 모델은 간단
Schema::create('stock_candle', function (Blueprint $table) {
    $table->id();
    $table->string('symbol');
    $table->double('open_price');
    // ...
});

class StockCandle extends Model {
    protected $table = 'stock_candle';
    protected $fillable = ['symbol', 'open', 'high', 'low', 'close'];
}
```

**차이점**: JPA는 어노테이션으로 스키마를 정의하고, `ddl-auto: create-drop` 설정으로 앱 시작 시 자동으로 테이블을 생성한다. 별도의 마이그레이션 파일이 필요 없다 (개발 환경 한정).

### Repository: SQL 없이 DB 접근

```java
// backend/src/main/java/example/stock/repository/StockCandleRepository.java

public interface StockCandleRepository extends JpaRepository<StockCandle, Long> {
    // 메서드 이름만으로 쿼리가 자동 생성된다!
    List<StockCandle> findBySymbolOrderByDatetimeDesc(String symbol);
    // → SELECT * FROM stock_candle WHERE symbol = ? ORDER BY datetime DESC
}
```

**인터페이스만 정의**하면 Spring Data JPA가 구현체를 자동 생성한다.

메서드 이름 규칙:

| 메서드 이름 | 생성되는 SQL |
|------------|-------------|
| `findBySymbol(String s)` | `WHERE symbol = ?` |
| `findBySymbolAndInterval(String s, String i)` | `WHERE symbol = ? AND interval = ?` |
| `findByPriceGreaterThan(Double p)` | `WHERE price > ?` |
| `countBySymbol(String s)` | `SELECT COUNT(*) WHERE symbol = ?` |
| `deleteBySymbol(String s)` | `DELETE WHERE symbol = ?` |

PHP Eloquent 대응:

```php
// PHP
StockCandle::where('symbol', $symbol)->orderBy('datetime', 'desc')->get();

// Java
stockCandleRepository.findBySymbolOrderByDatetimeDesc(symbol);
```

### JpaRepository가 기본 제공하는 메서드

| 메서드 | 설명 |
|--------|------|
| `save(entity)` | INSERT 또는 UPDATE |
| `findById(id)` | 기본 키로 조회 |
| `findAll()` | 전체 조회 |
| `deleteById(id)` | 삭제 |
| `count()` | 전체 건수 |

---

## 9. 캐싱 (Redis)

### StockCacheService 분석

```java
// backend/src/main/java/example/stock/cache/StockCacheService.java

@Service
public class StockCacheService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);  // TTL 5분

    // 캐시 키 패턴
    private static final String CANDLE_KEY_PATTERN = "stock:candles:%s:%s";
    //                                                              symbol  interval

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    // 캐시 조회
    public Optional<StockCandleResponse> getCachedCandles(String symbol, String interval) {
        try {
            String key = String.format(CANDLE_KEY_PATTERN, symbol, interval);
            // → "stock:candles:AAPL:1day"

            Object cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                // Redis에서 가져온 데이터를 DTO로 역직렬화
                String json = objectMapper.writeValueAsString(cached);
                StockCandleResponse response = objectMapper.readValue(json, StockCandleResponse.class);
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.warn("캔들 캐시 조회 실패: {}", e.getMessage());
        }
        return Optional.empty();
    }

    // 캐시 저장
    public void cacheCandles(String symbol, String interval, StockCandleResponse response) {
        try {
            String key = String.format(CANDLE_KEY_PATTERN, symbol, interval);
            redisTemplate.opsForValue().set(key, response, CACHE_TTL);
            // → Redis: SET "stock:candles:AAPL:1day" {json} EX 300
        } catch (Exception e) {
            log.warn("캔들 캐시 저장 실패: {}", e.getMessage());
        }
    }
}
```

### PHP Redis 사용과 비교

```php
// PHP Laravel
Cache::put("stock:candles:{$symbol}:{$interval}", $data, 300);
$cached = Cache::get("stock:candles:{$symbol}:{$interval}");

// Java Spring
redisTemplate.opsForValue().set(key, data, Duration.ofMinutes(5));
Object cached = redisTemplate.opsForValue().get(key);
```

### RedisConfig: 연결 실패 시 폴백

```java
// backend/src/main/java/example/stock/config/RedisConfig.java

@Bean
@Primary
public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
    try {
        connectionFactory.getConnection().ping();  // Redis 연결 테스트
        // 성공 → Redis 캐시 매니저 사용
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    } catch (Exception e) {
        // 실패 → 인메모리 캐시로 폴백 (서버 꺼지면 캐시 사라짐)
        log.warn("Redis 연결 실패 — 인메모리 캐시로 폴백");
        return new ConcurrentMapCacheManager();
    }
}
```

이 패턴은 **Graceful Degradation** (우아한 성능 저하)의 좋은 예시다. Redis가 없어도 앱이 동작한다.

---

## 10. WebSocket 실시간 통신

PHP에서는 WebSocket을 쓰려면 Ratchet이나 Swoole 같은 별도 라이브러리가 필요하다. Spring Boot는 내장 지원한다.

### 실시간 가격 업데이트 흐름

```
1. 클라이언트 → ws://서버/ws/stock 연결
2. 클라이언트 → {"type": "subscribe", "symbol": "AAPL"} 전송
3. StockWebSocketHandler → 구독 목록에 세션 추가
4. StockPriceScheduler (10초마다) → API로 가격 조회 → 구독자에게 브로드캐스트
5. 클라이언트 ← {"symbol": "AAPL", "price": 182.5, "time": 1710000000}
```

### StockWebSocketHandler 핵심 구조

```java
// backend/src/main/java/example/stock/websocket/StockWebSocketHandler.java

@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    // 종목별 구독 세션 관리: {"AAPL" → [session1, session2], "TSLA" → [session3]}
    private final Map<String, Set<WebSocketSession>> subscriptions = new ConcurrentHashMap<>();

    // 메시지 수신 시
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        WebSocketRequest request = objectMapper.readValue(
            message.getPayload(), WebSocketRequest.class);
        String symbol = request.getSymbol().toUpperCase();

        if ("subscribe".equalsIgnoreCase(request.getType())) {
            // 구독: 세션을 심볼의 구독자 집합에 추가
            subscriptions
                .computeIfAbsent(symbol, k -> ConcurrentHashMap.newKeySet())
                .add(session);
        } else if ("unsubscribe".equalsIgnoreCase(request.getType())) {
            // 구독 해제
            Set<WebSocketSession> sessions = subscriptions.get(symbol);
            if (sessions != null) sessions.remove(session);
        }
    }

    // 가격 브로드캐스트
    public void broadcastPrice(StockPriceMessage priceMessage) {
        String symbol = priceMessage.getSymbol();
        Set<WebSocketSession> sessions = subscriptions.getOrDefault(symbol, Collections.emptySet());

        String payload = objectMapper.writeValueAsString(priceMessage);
        TextMessage textMessage = new TextMessage(payload);

        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                synchronized (session) {    // 동시 전송 방지
                    session.sendMessage(textMessage);
                }
            }
        }
    }
}
```

### 스케줄러: 10초마다 가격 조회

```java
// backend/src/main/java/example/stock/websocket/StockPriceScheduler.java

@Component
public class StockPriceScheduler {

    private static final int MAX_SYMBOLS_PER_TICK = 6;  // API 제한 고려

    @Scheduled(fixedRate = 10000)  // 10초(10000ms)마다 실행
    public void fetchAndBroadcastPrices() {
        Set<String> subscribedSymbols = webSocketHandler.getSubscribedSymbols();

        if (subscribedSymbols.isEmpty()) return;  // 구독자 없으면 스킵

        int count = 0;
        for (String symbol : subscribedSymbols) {
            if (count >= MAX_SYMBOLS_PER_TICK) break;  // 속도 제한

            stockApiService.getPrice(symbol)
                .subscribe(price -> {           // 비동기로 가격 수신
                    if (price != null && price > 0) {
                        StockPriceMessage message = StockPriceMessage.builder()
                                .symbol(symbol)
                                .price(price)
                                .time(System.currentTimeMillis())
                                .build();
                        webSocketHandler.broadcastPrice(message);
                    }
                });
            count++;
        }
    }
}
```

**`@Scheduled(fixedRate = 10000)`**: PHP의 cron과 비슷하지만, 별도 프로세스 없이 앱 내부에서 실행된다. `@EnableScheduling`이 `StockApplication.java`에 있어야 동작한다.

---

## 11. 예외 처리

### 전역 예외 처리기

PHP Laravel의 `Handler::render()`와 동일한 역할:

```java
// backend/src/main/java/example/stock/controller/GlobalExceptionHandler.java

@RestControllerAdvice  // 모든 @RestController에 적용되는 전역 어드바이스
public class GlobalExceptionHandler {

    // 필수 파라미터 누락 시 (예: /search 호출 시 keyword 없음)
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(
            MissingServletRequestParameterException e) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .status(400)
                .message("필수 파라미터가 누락되었습니다: " + e.getParameterName())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.badRequest().body(error);
    }

    // 기타 모든 예외 (500 Internal Server Error)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception e) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .status(500)
                .message("서버 내부 오류가 발생했습니다.")
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

PHP Laravel 대응:

```php
// PHP
class Handler extends ExceptionHandler {
    public function render($request, Throwable $e) {
        if ($e instanceof MissingParameterException) {
            return response()->json(['error' => '파라미터 누락'], 400);
        }
        return response()->json(['error' => '서버 오류'], 500);
    }
}
```

### 서비스 계층의 방어적 예외 처리

```java
// StockService.java에서의 패턴
try {
    List<StockSearchResponse> results = apiService.searchSymbol(keyword).block();
    return results != null ? results : Collections.emptyList();
} catch (Exception e) {
    log.error("종목 검색 실패: keyword={}, error={}", keyword, e.getMessage());
    return Collections.emptyList();  // 에러 시 빈 리스트 (서비스 장애 전파 방지)
}
```

이 패턴은 외부 API 실패가 전체 서비스 장애로 이어지지 않도록 한다.

---

## 12. 설정 관리 (application.yml)

### PHP의 .env vs Spring Boot의 application.yml

```env
# PHP .env
STOCK_API_KEY=your_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
DB_CONNECTION=mysql
```

```yaml
# Java application.yml
server:
  port: ${PORT:8080}              # 환경변수 PORT, 없으면 8080

spring:
  datasource:
    url: jdbc:h2:mem:stockdb      # H2 인메모리 DB
  data:
    redis:
      url: ${REDIS_URL:redis://localhost:6379}
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}

stock:
  api:
    key: ${STOCK_API_KEY:demo}    # 환경변수, 없으면 "demo"
    base-url: https://api.twelvedata.com
```

### @Value로 설정값 주입

```java
// 설정값을 필드에 직접 주입
@Value("${stock.api.key:demo}")
private String apiKey;
// → STOCK_API_KEY 환경변수가 있으면 그 값, 없으면 "demo"

@Value("${stock.api.base-url:https://api.twelvedata.com}")
private String baseUrl;
```

**`${속성:기본값}`** 문법: PHP의 `env('KEY', 'default')`와 동일하다.

### 환경변수 우선순위

Spring Boot에서 설정값은 다음 순서로 적용된다 (위가 더 높은 우선순위):
1. 커맨드라인 인자 (`--server.port=9090`)
2. 환경변수 (`PORT=9090`)
3. `application.yml`
4. 코드의 기본값 (`@Value`의 `:` 뒤 값)

---

## 13. Lombok 라이브러리

Lombok은 반복적인 보일러플레이트 코드를 어노테이션으로 대체한다.

### @Data — Getter/Setter/toString/equals/hashCode 자동 생성

```java
// Lombok 사용
@Data
public class StockSearchResponse {
    private String symbol;
    private String instrumentName;
}

// Lombok 없이 직접 작성해야 하는 코드 (약 50줄)
public class StockSearchResponse {
    private String symbol;
    private String instrumentName;

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getInstrumentName() { return instrumentName; }
    public void setInstrumentName(String name) { this.instrumentName = name; }

    @Override
    public String toString() { ... }
    @Override
    public boolean equals(Object o) { ... }
    @Override
    public int hashCode() { ... }
}
```

PHP에서는 `public` 프로퍼티에 바로 접근하지만, Java는 관례적으로 getter/setter를 사용한다. Lombok이 이 보일러플레이트를 제거해준다.

### @Builder — 빌더 패턴

```java
// 빌더 패턴으로 객체 생성 (이 프로젝트 전반에서 사용)
StockCandleResponse response = StockCandleResponse.builder()
        .symbol("AAPL")
        .candles(candleList)
        .build();

// 빌더 없이
StockCandleResponse response = new StockCandleResponse();
response.setSymbol("AAPL");
response.setCandles(candleList);
```

빌더 패턴의 장점: 필드가 많을 때 어떤 값이 어떤 필드인지 명확하게 보인다.

### DTO에서 Lombok 조합

```java
// 이 프로젝트의 전형적인 DTO 패턴
@Data                    // getter, setter, toString, equals, hashCode
@NoArgsConstructor       // 기본 생성자 (JSON 역직렬화에 필요)
@AllArgsConstructor      // 모든 필드를 받는 생성자
@Builder                 // 빌더 패턴
public class StockCandleResponse {
    private String symbol;
    private List<CandleData> candles;
}
```

이 4개 조합은 Spring Boot DTO의 거의 표준이다.

---

## 14. 리액티브 프로그래밍 기초 (Mono/Flux)

### 왜 리액티브인가?

PHP에서 HTTP 요청은 동기적이다:
```php
$response = Http::get($url);  // 응답 올 때까지 대기 (스레드 블로킹)
```

Spring WebFlux는 **논블로킹** 방식을 지원한다:
```java
Mono<Map> response = webClient.get().uri(url).retrieve().bodyToMono(Map.class);
// 여기서 요청만 보내고 즉시 반환. 응답은 나중에 콜백으로 처리
```

### Mono vs Flux

| 타입 | 설명 | PHP 비유 |
|------|------|----------|
| `Mono<T>` | 0개 또는 1개의 결과 | 단일 값 Promise |
| `Flux<T>` | 0개 이상의 결과 스트림 | 여러 값의 Promise |

### 이 프로젝트에서의 사용

```java
// StockApiService.java
public Mono<Double> getPrice(String symbol) {
    return webClient.get()
            .uri(uriBuilder -> uriBuilder
                    .path("/price")
                    .queryParam("symbol", symbol)
                    .queryParam("apikey", apiKey)
                    .build())
            .retrieve()
            .bodyToMono(Map.class)           // Mono<Map>
            .map(response -> {               // Mono<Double>로 변환
                Object price = response.get("price");
                return parseDouble(price);
            })
            .doFinally(signal -> releaseRateLimit())  // 항상 실행
            .onErrorResume(e -> Mono.empty());         // 에러 시 빈 Mono
```

### 소비 방식

```java
// 방법 1: .block() — 동기적으로 결과 대기 (StockService에서 사용)
Double price = apiService.getPrice("AAPL").block();

// 방법 2: .subscribe() — 비동기 콜백 (StockPriceScheduler에서 사용)
apiService.getPrice(symbol)
    .subscribe(price -> {
        // 가격이 도착하면 이 코드가 실행됨
        webSocketHandler.broadcastPrice(message);
    });
```

**언제 .block()을 쓰고 언제 .subscribe()를 쓰나?**
- `.block()`: REST 응답을 만들어야 할 때 (결과가 필요)
- `.subscribe()`: Fire-and-forget (결과를 기다리지 않을 때, 예: 백그라운드 브로드캐스트)

---

## 15. 동시성 처리

PHP는 요청마다 프로세스가 분리되므로 동시성을 크게 신경 쓰지 않는다. 하지만 Spring Boot는 하나의 프로세스에서 여러 스레드가 동시에 실행된다.

### ConcurrentHashMap — 스레드 안전한 Map

```java
// StockWebSocketHandler.java
// 여러 WebSocket 연결이 동시에 구독/해제할 수 있으므로 ConcurrentHashMap 사용
private final Map<String, Set<WebSocketSession>> subscriptions = new ConcurrentHashMap<>();

// 일반 HashMap을 쓰면? → 동시 접근 시 데이터 손실/에러 발생 가능
```

### Semaphore — API 호출 속도 제한

```java
// StockApiService.java
// Twelve Data API 무료 티어: 분당 8회 제한
private final Semaphore rateLimiter = new Semaphore(8);

private boolean acquireRateLimit() {
    return rateLimiter.tryAcquire();  // 허가 있으면 true, 없으면 false (블로킹 안 함)
}

private void releaseRateLimit() {
    rateLimiter.release();            // 사용 후 허가 반환
}
```

**Semaphore 동작 원리**:
- 초기 허가 수: 8
- API 호출 시: `tryAcquire()` → 허가 1개 소모 (7개 남음)
- 호출 완료 시: `release()` → 허가 1개 반환 (8개로 복원)
- 허가가 0이면: `tryAcquire()` → `false` 반환, 요청 거부

### synchronized — 동시 전송 방지

```java
// StockWebSocketHandler.java
for (WebSocketSession session : sessions) {
    if (session.isOpen()) {
        synchronized (session) {       // 이 세션에 대해 한 번에 하나의 스레드만 전송
            session.sendMessage(textMessage);
        }
    }
}
```

`synchronized`는 PHP의 flock()과 비슷하다. 한 스레드가 블록 안에 있으면 다른 스레드는 기다린다.

### computeIfAbsent — 원자적 Map 연산

```java
// 키가 없으면 새 Set을 만들고, 있으면 기존 Set을 반환
subscriptions.computeIfAbsent(symbol, k -> ConcurrentHashMap.newKeySet()).add(session);

// 이것은 아래 코드의 스레드 안전 버전이다:
// if (!subscriptions.containsKey(symbol)) {
//     subscriptions.put(symbol, ConcurrentHashMap.newKeySet());
// }
// subscriptions.get(symbol).add(session);
// → 위 코드는 두 스레드가 동시에 containsKey를 통과하면 하나의 Set이 덮어씌워질 수 있음
```

---

## 16. 빌드와 의존성 관리 (Gradle)

### PHP의 Composer vs Java의 Gradle

```json
// PHP composer.json
{
    "require": {
        "laravel/framework": "^10.0",
        "predis/predis": "^2.0"
    }
}
```

```groovy
// Java build.gradle (이 프로젝트)
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.3'
}

java {
    sourceCompatibility = '17'    // Java 17 사용
}

dependencies {
    // Spring Boot 스타터 (관련 라이브러리 묶음)
    implementation 'org.springframework.boot:spring-boot-starter-web'        // REST API
    implementation 'org.springframework.boot:spring-boot-starter-websocket'  // WebSocket
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'   // JPA/DB
    implementation 'org.springframework.boot:spring-boot-starter-data-redis' // Redis
    implementation 'org.springframework.boot:spring-boot-starter-webflux'    // WebClient
    implementation 'org.springframework.boot:spring-boot-starter-cache'      // 캐시

    compileOnly 'org.projectlombok:lombok'          // 컴파일 시에만 (런타임 불필요)
    annotationProcessor 'org.projectlombok:lombok'   // 어노테이션 처리기

    runtimeOnly 'com.h2database:h2'                  // H2 DB (런타임에만)
}
```

### 주요 Gradle 명령어

| 명령어 | Composer 대응 | 설명 |
|--------|--------------|------|
| `./gradlew build` | `composer install` | 의존성 다운로드 + 빌드 |
| `./gradlew bootRun` | `php artisan serve` | 앱 실행 |
| `./gradlew test` | `./vendor/bin/phpunit` | 테스트 실행 |
| `./gradlew clean` | - | 빌드 결과물 삭제 |
| `./gradlew dependencies` | `composer show` | 의존성 트리 확인 |

### dependency 스코프

| 스코프 | 설명 |
|--------|------|
| `implementation` | 컴파일 + 런타임에 필요 (가장 일반적) |
| `compileOnly` | 컴파일에만 필요 (Lombok — 코드 생성 후 불필요) |
| `runtimeOnly` | 런타임에만 필요 (DB 드라이버 — 코드에서 직접 참조 안 함) |
| `annotationProcessor` | 어노테이션 처리기 (Lombok이 코드를 생성할 때) |
| `testImplementation` | 테스트 코드에서만 사용 |

---

## 17. 실습 과제

이 프로젝트를 기반으로 직접 코드를 수정하며 학습하는 과제들이다.

### Level 1: 기초

**과제 1-1: 새 API 엔드포인트 추가**
- `StockController`에 `GET /api/stock/health` 엔드포인트를 추가하라
- `{"status": "ok", "timestamp": "..."}` 형태의 JSON을 반환하라
- 새 DTO 클래스 `HealthResponse`를 만들어라

**과제 1-2: 로그 추가**
- `StockCacheService`의 각 메서드에 캐시 적중/미스 건수를 카운트하는 기능을 추가하라
- `/api/stock/health` 응답에 캐시 적중률을 포함시켜라

### Level 2: 중급

**과제 2-1: 새 외부 API 연동**
- `StockApiService`에 종목의 뉴스를 가져오는 메서드를 추가하라
- 새 DTO `StockNewsResponse`를 만들어라
- `StockController`에 `GET /api/stock/news?symbol=AAPL` 엔드포인트를 추가하라

**과제 2-2: 커스텀 예외 만들기**
- `StockNotFoundException`과 `RateLimitExceededException` 커스텀 예외를 만들어라
- `GlobalExceptionHandler`에서 각각 404, 429 응답을 반환하도록 처리하라
- `StockApiService`에서 적절한 상황에 이 예외들을 throw하라

### Level 3: 심화

**과제 3-1: 즐겨찾기 기능 구현**
- `FavoriteStock` 엔티티를 만들어라 (JPA)
- `FavoriteRepository`를 만들어라
- `POST /api/stock/favorites` (추가), `GET /api/stock/favorites` (목록), `DELETE /api/stock/favorites/{symbol}` (삭제) API를 구현하라
- 이 과제를 통해 JPA의 CRUD 전체를 경험할 수 있다

**과제 3-2: WebSocket 기능 확장**
- 가격 변동 알림 기능을 추가하라
- 클라이언트가 목표 가격을 설정하면 (`{"type": "alert", "symbol": "AAPL", "targetPrice": 200.0}`), 가격이 목표에 도달했을 때 알림을 보내라

---

## 부록: 유용한 참고 자료

### 공식 문서
- [Spring Boot 공식 가이드](https://spring.io/guides)
- [Spring Data JPA 레퍼런스](https://docs.spring.io/spring-data/jpa/reference/)
- [Baeldung (Java/Spring 튜토리얼)](https://www.baeldung.com/)

### 이 프로젝트에서 사용된 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Java | 17 | 프로그래밍 언어 |
| Spring Boot | 3.2.3 | 웹 프레임워크 |
| Spring WebFlux | - | 비동기 HTTP 클라이언트 (WebClient) |
| Spring Data JPA | - | ORM / DB 접근 |
| Spring Data Redis | - | Redis 캐시 |
| H2 Database | - | 인메모리 개발용 DB |
| Lombok | - | 보일러플레이트 코드 제거 |
| Gradle | 7.5.1 | 빌드 도구 |
| Twelve Data API | - | 주식 데이터 외부 API |

### 자주 사용하는 Java 문법 요약

```java
// 삼항 연산자 (PHP와 동일)
String result = value != null ? value : "default";

// 문자열 포맷 (PHP의 sprintf)
String key = String.format("stock:candles:%s:%s", symbol, interval);

// 람다 표현식 (PHP의 화살표 함수)
// PHP: $fn = fn($x) => $x * 2;
// Java:
Function<Integer, Integer> fn = x -> x * 2;

// 스트림 API (PHP의 array_map, array_filter)
List<String> symbols = stocks.stream()
    .filter(s -> s.getPrice() > 100)      // array_filter
    .map(Stock::getSymbol)                // array_map
    .collect(Collectors.toList());        // 결과 수집

// for-each (PHP의 foreach)
for (Map.Entry<String, Object> entry : map.entrySet()) {
    String key = entry.getKey();
    Object value = entry.getValue();
}

// instanceof (PHP의 instanceof와 동일)
if (response instanceof Map) {
    Map<String, Object> map = (Map<String, Object>) response;
}
```
