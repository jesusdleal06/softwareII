package co.edu.unipamplona.villadent.modules.users.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BootstrapAdminConfiguration {

    @Bean
    public BootstrapAdminSettings bootstrapAdminSettings(
            @Value("${app.bootstrap-admin.enabled:true}") boolean enabled,
            @Value("${BOOTSTRAP_ADMIN_EMAIL:}") String email,
            @Value("${BOOTSTRAP_ADMIN_PASSWORD:}") String password,
            @Value("${BOOTSTRAP_ADMIN_NAME:Auxiliar administrativo}") String name) {
        return new BootstrapAdminSettings(enabled, email, password, name);
    }
}
