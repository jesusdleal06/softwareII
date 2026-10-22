package co.edu.unipamplona.villadent.shared.clock;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    public static final ZoneId ZONE = ZoneId.of("America/Bogota");

    @Bean
    public Clock clock() {
        return Clock.system(ZONE);
    }
}
