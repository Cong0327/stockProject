package example.stock.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient 설정 클래스
 * Twelve Data API 호출을 위한 WebClient 빈을 구성한다.
 */
@Configuration
public class WebClientConfig {

    @Value("${stock.api.base-url:https://api.twelvedata.com}")
    private String baseUrl;

    /**
     * Twelve Data API 기본 URL이 설정된 WebClient 빈을 생성한다.
     */
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}
