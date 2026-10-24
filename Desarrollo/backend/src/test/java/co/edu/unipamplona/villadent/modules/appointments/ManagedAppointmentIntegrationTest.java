package co.edu.unipamplona.villadent.modules.appointments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase.BookAppointmentCommand;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@Import({TestcontainersConfiguration.class, ReminderTestConfiguration.class})
@SpringBootTest(properties = {
        "app.bootstrap-admin.enabled=false",
        "app.reminders.scheduler.enabled=false"
})
@AutoConfigureMockMvc
class ManagedAppointmentIntegrationTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final String MANAGE_BASE = "http://localhost:4200/cita/";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MutableClock clock;

    @Autowired
    private CapturingReminderSender sender;

    @Autowired
    private BookAppointmentUseCase bookAppointment;

    @Autowired
    private AppointmentRepository appointments;

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
        clock.set(LocalDateTime.of(2026, 10, 26, 9, 0));
        sender.clear();
        dentist = dentists.save(Dentist.create(
                "Dra. Camila Ortiz " + UUID.randomUUID(), "Ortodoncia", null));
        int day = MONDAY.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), day, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), day, LocalTime.of(14, 0), LocalTime.of(18, 0)));
        procedure = procedures.save(Procedure.create("Limpieza " + UUID.randomUUID(), 30));
    }

    private Long book(LocalTime time) {
        return bookAppointment.book(new BookAppointmentCommand(
                "Ana María Rueda",
                uniquePhone(),
                dentist.id(),
                procedure.id(),
                MONDAY,
                time,
                AppointmentOrigin.WEB)).id();
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private String tokenFor(LocalTime time) {
        return sender.messages().stream()
                .filter(message -> message.dentistName().equals(dentist.name()))
                .filter(message -> message.time().equals(time))
                .findFirst()
                .map(message -> message.manageUrl().substring(MANAGE_BASE.length()))
                .orElseThrow(() -> new AssertionError("No reminder sent for " + time));
    }

    private String manageUrl(String token) {
        return "/api/v1/public/appointments/manage/" + token;
    }

    @Test
    @DisplayName("CP-RF06-01: the link shows the appointment and confirms it")
    void linkShowsAndConfirms() throws Exception {
        Long id = book(LocalTime.of(10, 0));
        String token = tokenFor(LocalTime.of(10, 0));

        mockMvc.perform(get(manageUrl(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.date").value("2026-10-26"))
                .andExpect(jsonPath("$.time").value("10:00"))
                .andExpect(jsonPath("$.status").value("PENDIENTE"));

        mockMvc.perform(post(manageUrl(token) + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));
    }

    @Test
    @DisplayName("CP-RF06-02: cancelling frees the slot")
    void cancellingFreesTheSlot() throws Exception {
        Long id = book(LocalTime.of(10, 0));
        String token = tokenFor(LocalTime.of(10, 0));

        mockMvc.perform(post(manageUrl(token) + "/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADA"));

        assertThat(appointments.findById(id).orElseThrow().status().name()).isEqualTo("CANCELADA");
        Long replacement = book(LocalTime.of(10, 0));
        assertThat(appointments.findById(replacement)).isPresent();
    }

    @Test
    @DisplayName("CP-RF06-03: rescheduling frees the old slot and occupies the new one")
    void reschedulingFreesAndOccupies() throws Exception {
        Long id = book(LocalTime.of(10, 0));
        String token = tokenFor(LocalTime.of(10, 0));

        mockMvc.perform(post(manageUrl(token) + "/reschedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date": "2026-10-26", "time": "11:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.time").value("11:00"))
                .andExpect(jsonPath("$.status").value("REPROGRAMADA"));

        var rescheduled = appointments.findById(id).orElseThrow();
        assertThat(rescheduled.time()).isEqualTo(LocalTime.of(11, 0));
        assertThat(rescheduled.status().name()).isEqualTo("REPROGRAMADA");
        book(LocalTime.of(10, 0));
    }

    @Test
    @DisplayName("CP-RF06-04: without a patient response the appointment stays pending")
    void withoutAResponseTheAppointmentStaysPending() throws Exception {
        Long id = book(LocalTime.of(10, 0));
        String token = tokenFor(LocalTime.of(10, 0));

        mockMvc.perform(get(manageUrl(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDIENTE"));

        assertThat(appointments.findById(id).orElseThrow().status().name()).isEqualTo("PENDIENTE");
    }

    @Test
    @DisplayName("CP-RF06-05: an altered token answers 404 without touching the appointment")
    void alteredTokenAnswersNotFound() throws Exception {
        Long id = book(LocalTime.of(10, 0));

        mockMvc.perform(get(manageUrl("not-a-real-token")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No se encontró la cita."));

        assertThat(appointments.findById(id).orElseThrow().status().name()).isEqualTo("PENDIENTE");
    }

    @Test
    @DisplayName("CP-RF06-06: rescheduling into a taken slot answers 409 and keeps the original")
    void reschedulingIntoATakenSlotIsRejected() throws Exception {
        Long first = book(LocalTime.of(10, 0));
        book(LocalTime.of(11, 0));
        String token = tokenFor(LocalTime.of(10, 0));

        mockMvc.perform(post(manageUrl(token) + "/reschedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date": "2026-10-26", "time": "11:00"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "Este horario acaba de ser ocupado. Por favor elige otro."));

        var original = appointments.findById(first).orElseThrow();
        assertThat(original.time()).isEqualTo(LocalTime.of(10, 0));
        assertThat(original.status().name()).isEqualTo("PENDIENTE");
    }
}
