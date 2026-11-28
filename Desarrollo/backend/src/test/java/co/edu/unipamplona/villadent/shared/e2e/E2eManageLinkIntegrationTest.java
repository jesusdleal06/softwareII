package co.edu.unipamplona.villadent.shared.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase.BookAppointmentCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.support.MutableClock;
import java.time.Instant;
import java.time.ZoneId;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.ActiveProfiles;
import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MockMvc;

@Import({TestcontainersConfiguration.class, E2eManageLinkIntegrationTest.ClockConfiguration.class})
@ActiveProfiles("e2e")
@SpringBootTest(properties = {
        "app.bootstrap-admin.enabled=false",
        "app.reminders.scheduler.enabled=false"
})
@AutoConfigureMockMvc
class E2eManageLinkIntegrationTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final String MANAGE_BASE = "http://localhost:4291/cita/";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MutableClock clock;

    @Autowired
    private ReminderSender sender;

    @Autowired
    private BookAppointmentUseCase bookAppointment;

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
                AppointmentOrigin.MANUAL,
                null)).id();
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    @Test
    void issuesALinkThatOpensTheSameAppointment() throws Exception {
        Long id = book(LocalTime.of(10, 0));
        String response = mockMvc.perform(post("/api/v1/e2e/appointments/{id}/manage-link", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(response, "$.token");
        String url = JsonPath.read(response, "$.url");
        assertThat(url).isEqualTo(MANAGE_BASE + token);

        mockMvc.perform(get("/api/v1/public/appointments/manage/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void rejectsUnknownAppointment() throws Exception {
        mockMvc.perform(post("/api/v1/e2e/appointments/{id}/manage-link", Long.MAX_VALUE))
                .andExpect(status().isNotFound());
    }

    @Test
    void recordsRemindersInsteadOfSendingWhatsApp() {
        book(LocalTime.of(10, 0));
        assertThat(sender).isInstanceOfSatisfying(InMemoryReminderSender.class, fake ->
                assertThat(fake.messages()).anySatisfy(message -> {
                    assertThat(message.dentistName()).isEqualTo(dentist.name());
                    assertThat(message.manageUrl()).isEqualTo(MANAGE_BASE + message.manageToken());
                }));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfiguration {
        @Bean
        @Primary
        MutableClock e2eTestClock() {
            return new MutableClock(Instant.EPOCH, ZoneId.of("America/Bogota"));
        }
    }
}
