FROM gradle:8.5-jdk17 AS build
WORKDIR /app

COPY backend/build.gradle backend/settings.gradle ./
RUN gradle dependencies --no-daemon

COPY backend/src ./src
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

ENTRYPOINT java -Xms128m -Xmx256m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -jar -Dserver.port=${PORT:-8080} app.jar
