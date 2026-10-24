package co.edu.unipamplona.villadent.support;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class ReminderTestConfiguration {

    public static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    @Bean
    @Primary
    public MutableClock testClock() {
        return new MutableClock(
                LocalDateTime.of(2026, 10, 20, 10, 0).atZone(BOGOTA).toInstant(), BOGOTA);
    }

    @Bean
    @Primary
    public ReminderSender capturingReminderSender() {
        return new CapturingReminderSender();
    }
}
