package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class AvailabilityIntegrationTest {

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
    private PatientRepository patients;

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

    private void schedule(Dentist dentist, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(14, 0), LocalTime.of(18, 0)));
    }

    private Procedure procedure() {
        return procedures.save(Procedure.create("Limpieza " + UUID.randomUUID(), 30));
    }

    private Patient patient() {
        String phone = "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
        return patients.save(Patient.create("Paciente Ficticio", phone));
    }

    private Appointment appointment(
            Patient patient,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time) {
        return appointments.save(new Appointment(
                null,
                "VD-" + ThreadLocalRandom.current().nextInt(1_000_000_000),
                patient.id(),
                dentist.id(),
                procedure.id(),
                date,
                time,
                30,
                AppointmentStatus.CONFIRMADA,
                AppointmentOrigin.WEB,
                UUID.randomUUID().toString().replace("-", "")));
    }

    private String availabilityUrl(Dentist dentist, LocalDate date, Procedure procedure) {
        return "/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                .formatted(dentist.id(), date, procedure.id());
    }

    @Test
    @DisplayName("CP-RF01-01: hides the occupied slot")
    void hidesTheOccupiedSlot() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        schedule(dentist, date);
        Procedure procedure = procedure();
        appointment(patient(), dentist, procedure, date, LocalTime.of(10, 0));

        mockMvc.perform(get(availabilityUrl(dentist, date, procedure)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", hasItem("08:00")))
                .andExpect(jsonPath("$.slots", hasItem("10:30")))
                .andExpect(jsonPath("$.slots", not(hasItem("10:00"))));
    }

    @Test
    @DisplayName("CP-RF03-01: keeps availability independent between dentists")
    void keepsAvailabilityIndependentBetweenDentists() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist first = dentist("Dra. Laura Villamizar");
        Dentist second = dentist("Dr. Andrés Peña");
        schedule(first, date);
        schedule(second, date);
        Procedure procedure = procedure();
        appointment(patient(), first, procedure, date, LocalTime.of(10, 0));

        mockMvc.perform(get(availabilityUrl(second, date, procedure)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", hasItem("10:00")));
    }

    @Test
    @DisplayName("CP-RNF03-02: public responses carry no patient data")
    void publicResponsesCarryNoPatientData() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        schedule(dentist, date);
        Procedure procedure = procedure();
        appointment(patient(), dentist, procedure, date, LocalTime.of(9, 0));

        mockMvc.perform(get(availabilityUrl(dentist, date, procedure)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId").doesNotExist())
                .andExpect(jsonPath("$.patientName").doesNotExist())
                .andExpect(jsonPath("$.phone").doesNotExist())
                .andExpect(jsonPath("$.appointments").doesNotExist());

        mockMvc.perform(get("/api/v1/public/dentists"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].userId").isEmpty());

        mockMvc.perform(get("/api/v1/public/procedures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].active").isEmpty());
    }
}
