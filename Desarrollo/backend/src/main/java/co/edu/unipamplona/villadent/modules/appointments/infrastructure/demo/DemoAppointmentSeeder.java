package co.edu.unipamplona.villadent.modules.appointments.infrastructure.demo;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase.ResolvePatientCommand;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo-only appointments, so the agenda and the reports are not empty. It repeats the
 * prototype's Monday-to-Saturday week for the previous, the current and the next week,
 * relative to the day the backend starts.
 *
 * <ul>
 *   <li>It only runs on a database with no appointments at all, so it never mixes with real data.</li>
 *   <li>Past appointments are attended unless the week marks them as no-show or cancelled;
 *       from today on they keep the week's status (pending, confirmed, rescheduled, cancelled),
 *       except a no-show, which can only happen afterwards and becomes pending.</li>
 *   <li>Every appointment gets its own fictitious patient phone (3XX 555 XXXX), so the
 *       one-active-appointment rule holds.</li>
 *   <li>It schedules no reminders: nothing may ever be sent to a demo phone.</li>
 * </ul>
 */
@Component
@Profile("demo")
@Order(2)
public class DemoAppointmentSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(DemoAppointmentSeeder.class);
    private static final String LAURA = "Dra. Laura Villamizar";
    private static final String ANDRES = "Dr. Andrés Peña";
    private static final String CAMILA = "Dra. Camila Ortiz";
    private static final String CLEANING = "Limpieza";
    private static final String FILLING = "Calza (resina)";
    private static final String CHECKUP = "Valoración";
    private static final String EXTRACTION = "Exodoncia";
    private static final String BRACES = "Instalación de brackets";

    /** The prototype week: day offset from Monday, dentist, procedure, time, patient, status. */
    private static final List<Seed> WEEK = List.of(
            new Seed(0, LAURA, CLEANING, "08:00", "María Fernanda López", null),
            new Seed(0, LAURA, FILLING, "09:00", "Jorge Enrique Castro", AppointmentStatus.NO_ASISTIO),
            new Seed(0, ANDRES, BRACES, "14:00", "Valentina Suárez", null),
            new Seed(1, LAURA, CHECKUP, "10:00", "Carlos Alberto Rincón", null),
            new Seed(1, CAMILA, EXTRACTION, "15:00", "Luz Marina Pérez", AppointmentStatus.CANCELADA),
            new Seed(1, LAURA, CLEANING, "16:30", "Pedro Pablo Díaz", null),
            new Seed(2, LAURA, CLEANING, "08:30", "Gloria Inés Mantilla", AppointmentStatus.CONFIRMADA),
            new Seed(2, ANDRES, CHECKUP, "10:00", "Sebastián Gómez", AppointmentStatus.CONFIRMADA),
            new Seed(2, LAURA, EXTRACTION, "14:00", "Rosa Elvira Jaimes", AppointmentStatus.PENDIENTE),
            new Seed(2, CAMILA, EXTRACTION, "15:30", "Hernando Ariza", AppointmentStatus.REPROGRAMADA),
            new Seed(3, LAURA, FILLING, "09:00", "Diana Carolina Ruiz", AppointmentStatus.PENDIENTE),
            new Seed(3, ANDRES, BRACES, "08:00", "Andrés Felipe Mora", AppointmentStatus.CONFIRMADA),
            new Seed(3, LAURA, CLEANING, "15:00", "Olga Lucía Torres", AppointmentStatus.PENDIENTE),
            new Seed(4, CAMILA, EXTRACTION, "10:00", "Miguel Ángel Prada", AppointmentStatus.PENDIENTE),
            new Seed(4, LAURA, CHECKUP, "11:00", "Camilo Andrés Vera", AppointmentStatus.CONFIRMADA),
            new Seed(5, LAURA, CLEANING, "09:30", "Teresa de Jesús Niño", AppointmentStatus.PENDIENTE));

    /** Previous, current and next week; each gets its own phone prefix (300, 310, 320). */
    private static final int[] WEEKS = {-1, 0, 1};

    private final AppointmentRepository appointments;
    private final ResolvePatientUseCase patients;
    private final ListDentistsUseCase dentists;
    private final ListProceduresUseCase procedures;
    private final Clock clock;

    public DemoAppointmentSeeder(
            AppointmentRepository appointments,
            ResolvePatientUseCase patients,
            ListDentistsUseCase dentists,
            ListProceduresUseCase procedures,
            Clock clock) {
        this.appointments = appointments;
        this.patients = patients;
        this.dentists = dentists;
        this.procedures = procedures;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (appointments.count() > 0) {
            LOG.info("Demo appointments skipped: the database already has appointments");
            return;
        }
        LocalDate today = LocalDate.now(clock);
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int created = 0;
        for (int w = 0; w < WEEKS.length; w++) {
            for (int i = 0; i < WEEK.size(); i++) {
                Seed seed = WEEK.get(i);
                LocalDate date = monday.plusWeeks(WEEKS[w]).plusDays(seed.dayOffset());
                String phone = "%d555%04d".formatted(300 + 10 * w, i + 1);
                PatientResult patient = patients.resolve(new ResolvePatientCommand(seed.patient(), phone));
                ProcedureResult procedure = procedure(seed.procedure());
                appointments.save(new Appointment(
                        null,
                        appointments.nextCode(),
                        patient.id(),
                        dentist(seed.dentist()).id(),
                        procedure.id(),
                        date,
                        LocalTime.parse(seed.time()),
                        procedure.durationMinutes(),
                        statusFor(seed, date, today),
                        AppointmentOrigin.WEB,
                        null));
                created++;
            }
        }
        LOG.info("Demo appointments ready: {}", created);
    }

    private static AppointmentStatus statusFor(Seed seed, LocalDate date, LocalDate today) {
        boolean terminal = seed.status() == AppointmentStatus.NO_ASISTIO
                || seed.status() == AppointmentStatus.CANCELADA;
        if (date.isBefore(today)) {
            return terminal ? seed.status() : AppointmentStatus.ATENDIDA;
        }
        // Attendance is only known afterwards; a cancellation can happen ahead of time.
        if (seed.status() == null || seed.status() == AppointmentStatus.NO_ASISTIO) {
            return AppointmentStatus.PENDIENTE;
        }
        return seed.status();
    }

    private DentistResult dentist(String name) {
        return dentists.list().stream()
                .filter(dentist -> dentist.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Demo dentist missing: " + name));
    }

    private ProcedureResult procedure(String name) {
        return procedures.list().stream()
                .filter(procedure -> procedure.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Demo procedure missing: " + name));
    }

    private record Seed(
            int dayOffset, String dentist, String procedure, String time, String patient,
            AppointmentStatus status) {
    }
}
