package co.edu.unipamplona.villadent.modules.reminders;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase.BookAppointmentCommand;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAgendaUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.SendDueRemindersUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import co.edu.unipamplona.villadent.support.CapturingReminderSender;
import co.edu.unipamplona.villadent.support.MutableClock;
import co.edu.unipamplona.villadent.support.ReminderTestConfiguration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import({TestcontainersConfiguration.class, ReminderTestConfiguration.class})
@SpringBootTest(properties = {
        "app.bootstrap-admin.enabled=false",
        "app.reminders.scheduler.enabled=false"
})
class ReminderIntegrationTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);

    @Autowired
    private MutableClock clock;

    @Autowired
    private CapturingReminderSender sender;

    @Autowired
    private BookAppointmentUseCase bookAppointment;

    @Autowired
    private ScheduleReminderUseCase scheduleReminder;

    @Autowired
    private SendDueRemindersUseCase sendDueReminders;

    @Autowired
    private GetAgendaUseCase getAgenda;

    @Autowired
    private AppointmentRepository appointments;

    @Autowired
    private ReminderRepository reminders;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ScheduleRepository schedules;

    @Autowired
    private ProcedureRepository procedures;

    private Dentist dentist;

    private Procedure procedure;

    @BeforeEach
    void setUp() {
        clock.set(LocalDateTime.of(2026, 10, 20, 10, 0));
        sender.clear();
        dentist = dentists.save(Dentist.create(
                "Dra. Laura Villamizar " + UUID.randomUUID(), "Odontología general", null));
        int day = MONDAY.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), day, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), day, LocalTime.of(14, 0), LocalTime.of(18, 0)));
        procedure = procedures.save(Procedure.create("Limpieza " + UUID.randomUUID(), 30));
    }

    private Appointment book(LocalDate date, LocalTime time) {
        var result = bookAppointment.book(new BookAppointmentCommand(
                "Ana María Rueda",
                uniquePhone(),
                dentist.id(),
                procedure.id(),
                date,
                time,
                AppointmentOrigin.WEB));
        return appointments.findById(result.id()).orElseThrow();
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    @Test
    @DisplayName("CP-RF05-01: a morning appointment is reminded the day before at 18:00")
    void morningReminderTheDayBeforeAt1800() {
        Appointment appointment = book(MONDAY, LocalTime.of(9, 0));

        var reminder = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();

        assertThat(reminder.status()).isEqualTo(ReminderStatus.PROGRAMADO);
        assertThat(reminder.scheduledFor()).isEqualTo(LocalDateTime.of(2026, 10, 25, 18, 0));
        assertThat(reminder.attempts()).isZero();
        assertThat(sender.messages()).isEmpty();
    }

    @Test
    @DisplayName("CP-RF05-02: an afternoon appointment is reminded the same day at 08:00")
    void afternoonReminderTheSameDayAt0800() {
        Appointment appointment = book(MONDAY, LocalTime.of(14, 0));

        var reminder = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();

        assertThat(reminder.status()).isEqualTo(ReminderStatus.PROGRAMADO);
        assertThat(reminder.scheduledFor()).isEqualTo(LocalDateTime.of(2026, 10, 26, 8, 0));
    }

    @Test
    @DisplayName("CP-RF05-03: a cancelled appointment keeps no programmed reminder")
    void cancelledAppointmentHasNoReminder() {
        Appointment appointment = book(MONDAY, LocalTime.of(9, 0));
        appointments.save(appointment.cancel());

        scheduleReminder.schedule(appointment.id());

        var reminder = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();
        assertThat(reminder.status()).isEqualTo(ReminderStatus.CANCELADO);
    }

    @Test
    @DisplayName("CP-RF05-04: a failed send is recorded and retried five minutes later")
    void failedSendIsRecordedAndRetried() {
        clock.set(LocalDateTime.of(2026, 10, 26, 9, 0));
        sender.failWith(new IllegalStateException("WhatsApp no está configurado."));

        Appointment appointment = book(MONDAY, LocalTime.of(10, 0));

        var failed = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();
        assertThat(failed.status()).isEqualTo(ReminderStatus.PROGRAMADO);
        assertThat(failed.attempts()).isEqualTo(1);
        assertThat(failed.lastError()).contains("WhatsApp no está configurado.");
        assertThat(failed.scheduledFor()).isEqualTo(LocalDateTime.of(2026, 10, 26, 9, 5));
        assertThat(getAgenda.agenda(MONDAY, dentist.id()).getFirst().reminderStatus())
                .isEqualTo("PROGRAMADO");
        assertThat(getAgenda.agenda(MONDAY, dentist.id()).getFirst().reminderAttempts()).isEqualTo(1);

        sender.succeed();
        clock.advanceMinutes(5);
        sendDueReminders.sendDue();

        var retried = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();
        assertThat(retried.status()).isEqualTo(ReminderStatus.ENVIADO);
        assertThat(retried.attempts()).isEqualTo(2);
        assertThat(sender.messages())
                .anyMatch(message -> message.dentistName().equals(dentist.name())
                        && message.time().equals(LocalTime.of(10, 0)));
    }

    @Test
    @DisplayName("CP-RF05-06: a reminder time already past is sent immediately")
    void reminderInThePastIsSentImmediately() {
        clock.set(LocalDateTime.of(2026, 10, 26, 9, 0));

        Appointment appointment = book(MONDAY, LocalTime.of(10, 0));

        var reminder = reminders.findLatestByAppointmentId(appointment.id()).orElseThrow();
        assertThat(reminder.status()).isEqualTo(ReminderStatus.ENVIADO);
        assertThat(reminder.attempts()).isEqualTo(1);
        assertThat(sender.messages()).hasSize(1);
        assertThat(sender.messages().getFirst().manageUrl())
                .startsWith("http://localhost:4200/cita/");
    }
}
