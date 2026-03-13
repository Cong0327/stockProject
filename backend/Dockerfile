FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# 1) 빌드 설정만 먼저 복사 → 의존성 다운로드 (캐싱됨)
COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon

# 2) 소스 복사 → 빌드 (소스 변경 시 여기부터만 재실행)
COPY src ./src
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
