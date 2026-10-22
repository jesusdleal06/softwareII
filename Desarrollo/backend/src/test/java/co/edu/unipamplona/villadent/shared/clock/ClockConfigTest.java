package co.edu.unipamplona.villadent.shared.clock;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class ClockConfigTest {

    @Test
    void clockUsesAmericaBogotaZone() {
        Clock clock = new ClockConfig().clock();

        assertThat(clock).isNotNull();
        assertThat(clock.getZone()).isEqualTo(ZoneId.of("America/Bogota"));
    }
}
