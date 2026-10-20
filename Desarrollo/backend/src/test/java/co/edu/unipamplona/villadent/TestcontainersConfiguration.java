package co.edu.unipamplona.villadent;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		// Pinned to the same major as Desarrollo/backend/docker-compose.yml, so
		// tests and the dev database cannot drift apart; `latest` would change
		// the PostgreSQL version under the suite whenever Docker pulls again.
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
	}

}
