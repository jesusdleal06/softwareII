package co.edu.unipamplona.villadent.modules.appointments.infrastructure.demo;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {"app.bootstrap-admin.enabled=false", "app.reminders.scheduler.enabled=false"})
@ActiveProfiles("demo")
class DemoAppointmentSeederTest {

    @Autowired
    private DemoAppointmentSeeder seeder;

    @Autowired
    private AppointmentRepository appointments;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Clock clock;

    private List<Appointment> seededWindow() {
        LocalDate monday = LocalDate.now(clock).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return appointments.findForReport(monday.minusWeeks(1), monday.plusWeeks(1).plusDays(5), null);
    }

    @Test
    @DisplayName("The demo profile fills the previous, current and next week with appointments")
    void fillsThreeWeeksOfAppointments() {
        List<Appointment> seeded = seededWindow();
        LocalDate today = LocalDate.now(clock);

        assertThat(seeded).hasSize(48);
        // Past days are history: attended, no-show or cancelled, never still pending.
        assertThat(seeded).filteredOn(appointment -> appointment.date().isBefore(today))
                .isNotEmpty()
                .allMatch(appointment -> !appointment.occupiesSlot());
        assertThat(seeded).filteredOn(appointment -> appointment.date().isBefore(today))
                .extracting(Appointment::status)
                .contains(AppointmentStatus.ATENDIDA, AppointmentStatus.NO_ASISTIO, AppointmentStatus.CANCELADA);
        // From today on, the agenda has appointments waiting to happen.
        assertThat(seeded).filteredOn(appointment -> !appointment.date().isBefore(today))
                .extracting(Appointment::status)
                .contains(AppointmentStatus.PENDIENTE, AppointmentStatus.CONFIRMADA);
        // Attendance is only known afterwards: no future appointment is attended or a no-show.
        assertThat(seeded).filteredOn(appointment -> appointment.date().isAfter(today))
                .extracting(Appointment::status)
                .doesNotContain(AppointmentStatus.ATENDIDA, AppointmentStatus.NO_ASISTIO);
    }

    @Test
    @DisplayName("Seeded patients keep one active appointment each, and no reminder is scheduled")
    void keepsTheBookingRulesAndSchedulesNoReminders() {
        Map<Long, Long> activeByPatient = seededWindow().stream()
                .filter(Appointment::occupiesSlot)
                .collect(Collectors.groupingBy(Appointment::patientId, Collectors.counting()));

        assertThat(activeByPatient.values()).allMatch(count -> count == 1);
        // Demo phones are fictitious: nothing may ever be sent to them.
        assertThat(jdbc.queryForObject("select count(*) from recordatorios", Long.class)).isZero();
    }

    @Test
    @DisplayName("Running the seeder again adds nothing")
    void runningAgainAddsNothing() throws Exception {
        int before = seededWindow().size();

        seeder.run(new DefaultApplicationArguments(new String[0]));

        assertThat(seededWindow()).hasSize(before);
    }
}
