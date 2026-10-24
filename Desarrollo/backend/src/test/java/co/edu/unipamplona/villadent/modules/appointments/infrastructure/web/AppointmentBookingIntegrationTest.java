package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class AppointmentBookingIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ScheduleRepository schedules;

    @Autowired
    private ProcedureRepository procedures;

    @Autowired
    private AppointmentRepository appointments;

    private LocalDate nextWorkingDay() {
        LocalDate date = LocalDate.now(Clock.system(BOGOTA)).plusDays(1);
        while (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
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

    private Procedure procedure(String name, int durationMinutes) {
        return procedures.save(Procedure.create(name + " " + UUID.randomUUID(), durationMinutes));
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private String bookingJson(
            String patientName,
            String phone,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time) {
        return """
                {
                  "patientName": "%s",
                  "patientPhone": "%s",
                  "dentistId": %d,
                  "procedureId": %d,
                  "date": "%s",
                  "time": "%s"
                }
                """.formatted(patientName, phone, dentist.id(), procedure.id(), date, time);
    }

    private MvcResult book(
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String patientName,
            String phone) throws Exception {
        return mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson(patientName, phone, dentist, procedure, date, time)))
                .andReturn();
    }

    private String availabilityUrl(Dentist dentist, LocalDate date, Procedure procedure) {
        return "/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                .formatted(dentist.id(), date, procedure.id());
    }

    @Test
    @DisplayName("CP-RF04-01: a 60-minute procedure blocks 14:00 to 15:00")
    void blocksSixtyMinutes() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure exodontia = procedure("Exodoncia", 60);

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", uniquePhone(), dentist, exodontia,
                                date, LocalTime.of(14, 0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.durationMinutes").value(60))
                .andExpect(jsonPath("$.time").value("14:00"))
                .andExpect(jsonPath("$.status").value("PENDIENTE"));

        String url = availabilityUrl(dentist, date, exodontia);
        mockMvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", not(hasItem("14:00"))))
                .andExpect(jsonPath("$.slots", not(hasItem("14:30"))))
                .andExpect(jsonPath("$.slots", hasItem("15:00")));
    }

    @Test
    @DisplayName("CP-RF04-02: a 30-minute procedure blocks only 9:00 to 9:30")
    void blocksThirtyMinutes() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dr. Andrés Peña");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);

        book(dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());

        String url = availabilityUrl(dentist, date, cleaning);
        mockMvc.perform(get(url))
                .andExpect(jsonPath("$.slots", not(hasItem("09:00"))))
                .andExpect(jsonPath("$.slots", hasItem("09:30")));
    }

    @Test
    @DisplayName("CP-RF04-03: a 60-minute procedure cannot use a 30-minute gap")
    void doesNotFitInAThirtyMinuteGap() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        Procedure exodontia = procedure("Exodoncia", 60);

        book(dentist, cleaning, date, LocalTime.of(9, 30), "Ana María Rueda", uniquePhone());

        mockMvc.perform(get(availabilityUrl(dentist, date, exodontia)))
                .andExpect(jsonPath("$.slots", not(hasItem("09:00"))));

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Carlos Pérez", uniquePhone(), dentist, exodontia,
                                date, LocalTime.of(9, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"))
                .andExpect(jsonPath("$.detail").value(
                        "Este horario acaba de ser ocupado. Por favor elige otro."));
    }

    @Test
    @DisplayName("CP-RF04-04: a 45-minute procedure blocks 10:00 to 10:45 and offers 11:00")
    void blocksFortyFiveMinutes() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure filling = procedure("Calza (resina)", 45);

        book(dentist, filling, date, LocalTime.of(10, 0), "Ana María Rueda", uniquePhone());

        mockMvc.perform(get(availabilityUrl(dentist, date, filling)))
                .andExpect(jsonPath("$.slots", not(hasItem("10:00"))))
                .andExpect(jsonPath("$.slots", not(hasItem("10:30"))))
                .andExpect(jsonPath("$.slots", hasItem("11:00")));
    }

    @Test
    @DisplayName("CP-RF04-05: a 90-minute procedure blocks 14:00 to 15:30")
    void blocksNinetyMinutes() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dr. Andrés Peña");
        clinicHours(dentist, date);
        Procedure brackets = procedure("Instalación de brackets", 90);

        book(dentist, brackets, date, LocalTime.of(14, 0), "Ana María Rueda", uniquePhone());

        mockMvc.perform(get(availabilityUrl(dentist, date, brackets)))
                .andExpect(jsonPath("$.slots", not(hasItem("14:00"))))
                .andExpect(jsonPath("$.slots", not(hasItem("14:30"))))
                .andExpect(jsonPath("$.slots", not(hasItem("15:00"))))
                .andExpect(jsonPath("$.slots", hasItem("15:30")));
    }

    @Test
    @DisplayName("CP-RF07-02: blocks a second active appointment for the same phone")
    void blocksASecondActiveAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String phone = uniquePhone();

        book(dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", phone);

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, cleaning,
                                date, LocalTime.of(10, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ACTIVE_APPOINTMENT_EXISTS"))
                .andExpect(jsonPath("$.detail").value(
                        "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva."));
    }

    @Test
    @DisplayName("CP-RF07-03: only one of two simultaneous bookings is saved")
    void savesOnlyOneSimultaneousBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String firstPhone = uniquePhone();
        String secondPhone = uniquePhone();

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = pool.submit(() -> {
                start.await();
                return book(dentist, cleaning, date, LocalTime.of(10, 0), "Ana María Rueda", firstPhone);
            });
            Future<MvcResult> second = pool.submit(() -> {
                start.await();
                return book(dentist, cleaning, date, LocalTime.of(10, 0), "Carlos Pérez", secondPhone);
            });
            start.countDown();

            List<Integer> statuses = List.of(
                    first.get().getResponse().getStatus(),
                    second.get().getResponse().getStatus());
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
            assertThat(appointments.findByDentistIdAndDate(dentist.id(), date).stream()
                    .filter(appointment -> appointment.time().equals(LocalTime.of(10, 0)))
                    .filter(Appointment::occupiesSlot))
                    .hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("CP-RF01-03: cancelling frees the slot")
    void cancellingFreesTheSlot() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dr. Andrés Peña");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);

        MvcResult result = book(dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());
        Long id = Long.valueOf(JsonPath.read(result.getResponse().getContentAsString(), "$.id").toString());
        Appointment appointment = appointments.findById(id).orElseThrow();
        appointments.save(appointment.cancel());

        mockMvc.perform(get(availabilityUrl(dentist, date, cleaning)))
                .andExpect(jsonPath("$.slots", hasItem("09:00")));
    }

    @Test
    @DisplayName("CP-RF03-02: rejects an overlapping booking for the same dentist")
    void rejectsAnOverlappingBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);

        book(dentist, cleaning, date, LocalTime.of(10, 0), "Ana María Rueda", uniquePhone());

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Carlos Pérez", uniquePhone(), dentist, cleaning,
                                date, LocalTime.of(10, 15))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"));
    }
}
