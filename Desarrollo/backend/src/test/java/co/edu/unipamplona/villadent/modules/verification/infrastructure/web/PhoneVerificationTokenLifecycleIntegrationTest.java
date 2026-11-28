package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.PhoneNotVerifiedException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.ConsumeVerificationTokenUseCase;
import co.edu.unipamplona.villadent.support.CapturingVerificationSender;
import co.edu.unipamplona.villadent.support.MutableClock;
import co.edu.unipamplona.villadent.support.PublicBookingTestSupport;
import co.edu.unipamplona.villadent.support.VerificationTestConfiguration;
import jakarta.servlet.ServletException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@Import({
        TestcontainersConfiguration.class,
        VerificationTestConfiguration.class,
        PhoneVerificationTokenLifecycleIntegrationTest.FailingReminderConfiguration.class
})
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class PhoneVerificationTokenLifecycleIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final String PUBLIC_APPOINTMENTS = "/api/v1/public/appointments";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CapturingVerificationSender verificationSender;

    @Autowired
    private ConsumeVerificationTokenUseCase consumeVerificationToken;

    @Autowired
    private MutableClock clock;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ScheduleRepository schedules;

    @Autowired
    private ProcedureRepository procedures;

    @Autowired
    private AppointmentRepository appointments;

    @Test
    @DisplayName("CP-RF02-09: an expired verification token is rejected")
    void anExpiredVerificationTokenIsRejected() throws Exception {
        String phone = uniquePhone();
        String token = PublicBookingTestSupport.obtainToken(mockMvc, verificationSender, phone);

        clock.advanceMinutes(VerificationToken.VALIDITY_MINUTES + 1L);

        assertThatThrownBy(() -> consumeVerificationToken.consume(token, phone))
                .isInstanceOf(PhoneNotVerifiedException.class)
                .hasMessage("Verifica tu número de celular para confirmar la cita.");
    }

    @Test
    @DisplayName("CP-RF02-09: a failure after the token was consumed rolls the consumption back")
    void aFailureAfterTheTokenWasConsumedRollsItBack() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure procedure = procedure("Limpieza");
        String phone = uniquePhone();
        String token = PublicBookingTestSupport.obtainToken(mockMvc, verificationSender, phone);

        assertThatThrownBy(() -> mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, procedure, date,
                                LocalTime.of(9, 0), token))))
                .isInstanceOf(ServletException.class);

        // The reminder failed after the token was consumed, so the consumption must have rolled back.
        assertThatCode(() -> consumeVerificationToken.consume(token, phone)).doesNotThrowAnyException();
        assertThat(occupying(dentist, date)).isEmpty();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FailingReminderConfiguration {

        @Bean
        @Primary
        MutableClock lifecycleClock() {
            return new MutableClock(Instant.now(), BOGOTA);
        }

        @Bean
        @Primary
        ScheduleReminderUseCase failingReminder() {
            return appointmentId -> {
                throw new IllegalStateException("reminder service down");
            };
        }
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private LocalDate nextWorkingDay() {
        LocalDate date = LocalDate.now(Clock.system(BOGOTA)).plusDays(1);
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private Dentist dentist(String name) {
        return dentists.save(Dentist.create(name, "Odontología general", null));
    }

    private void clinicHours(Dentist dentist, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(14, 0), LocalTime.of(18, 0)));
    }

    private Procedure procedure(String name) {
        return procedures.save(Procedure.create(name + " " + UUID.randomUUID(), 30));
    }

    private String bookingJson(
            String patientName,
            String phone,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String verificationToken) {
        return """
                {
                  "patientName": "%s",
                  "patientPhone": "%s",
                  "dentistId": %d,
                  "procedureId": %d,
                  "date": "%s",
                  "time": "%s",
                  "verificationToken": "%s"
                }
                """.formatted(patientName, phone, dentist.id(), procedure.id(), date, time, verificationToken);
    }

    private List<Appointment> occupying(Dentist dentist, LocalDate date) {
        return appointments.findByDentistIdAndDate(dentist.id(), date).stream()
                .filter(Appointment::occupiesSlot)
                .toList();
    }
}
