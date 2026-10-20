# Dev image for the Villadent backend (Java 21 + Spring Boot 4.1.2 + Gradle 9.8.1).
#
# The image only supplies the toolchain: at runtime the compose file bind-mounts
# the project into /app, exactly like the frontend image does. Nothing here
# builds a deployable artifact yet.
#
# It runs as `ubuntu` (uid/gid 1000, already present in this base image) instead
# of root: the source is a bind mount, so anything Gradle writes there appears on
# the host, and a root-owned file cannot be edited by the developer afterwards.
# 1000 is also the usual host uid; on a machine where it differs, run the
# container with `user: "<uid>:<gid>"` in the compose file instead.
FROM eclipse-temurin:21-jdk

# Keep Gradle's cache (downloaded distribution + dependencies, several hundred
# MB) in one explicit path instead of depending on the base image's home
# directory. The compose file mounts a named volume here, so it survives
# `docker compose down` and the heavy download happens only once.
ENV GRADLE_USER_HOME=/home/ubuntu/.gradle

WORKDIR /app

# Create the directories that the compose file shadows with anonymous volumes
# and hand the whole workdir to `ubuntu`. Both steps must happen before the USER
# switch: Docker seeds those volumes from the image, so a root-owned directory
# here would be copied into the volume as root and Gradle could not write its
# file hash cache ("Cannot create directory /app/.gradle/9.8.1/fileHashes").
RUN mkdir -p /app/build /app/.gradle \
 && chown -R ubuntu:ubuntu /app
USER ubuntu

# Download the Gradle distribution declared in gradle-wrapper.properties while
# building the image. It is ~130 MB and never changes between runs, so baking it
# in means the first `docker compose up` starts compiling immediately.
COPY --chown=ubuntu:ubuntu gradlew settings.gradle build.gradle ./
COPY --chown=ubuntu:ubuntu gradle/ gradle/
RUN ./gradlew --version

EXPOSE 8080

# `-t classes` recompiles on every save while `bootRun` keeps the application
# running; spring-boot-devtools (an existing developmentOnly dependency) notices
# the new class files and restarts the context in a couple of seconds. Gradle
# allows both builds to run concurrently in the same project, and `exec` leaves
# bootRun as the container's main process so `docker compose stop` shuts the
# application down cleanly instead of killing a shell around it.
CMD ["sh", "-c", "./gradlew -t classes --console=plain & exec ./gradlew bootRun --console=plain"]
