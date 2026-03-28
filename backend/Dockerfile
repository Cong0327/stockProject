FROM gradle:8.5-jdk17 AS build
WORKDIR /app

COPY backend/build.gradle backend/settings.gradle ./
RUN gradle dependencies --no-daemon

COPY backend/src ./src
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

ENTRYPOINT java -Xms256m -Xmx512m -XX:MaxMetaspaceSize=128m -Xss256k -XX:+UseSerialGC -XX:+UseContainerSupport -jar -Dserver.port=${PORT:-8080} app.jar
