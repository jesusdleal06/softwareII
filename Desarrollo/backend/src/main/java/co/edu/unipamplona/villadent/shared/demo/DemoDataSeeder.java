package co.edu.unipamplona.villadent.shared.demo;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase.AddScheduleCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase.RegisterDentistCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase.RegisterProcedureCommand;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase.RegisterUserCommand;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import java.time.LocalTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo-only data, mirroring the Angular prototype. It runs only with the
 * {@code demo} profile, uses the public use cases instead of SQL, and is
 * idempotent because every entity is matched by its natural key.
 */
@Component
@Profile("demo")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String DEMO_PASSWORD = "villadent2024";
    private static final List<Shift> SHIFTS = List.of(
            new Shift(LocalTime.of(8, 0), LocalTime.of(12, 0)),
            new Shift(LocalTime.of(14, 0), LocalTime.of(18, 0)));
    private static final List<DemoProcedure> PROCEDURES = List.of(
            new DemoProcedure("Limpieza", 30),
            new DemoProcedure("Calza (resina)", 45),
            new DemoProcedure("Valoración", 30),
            new DemoProcedure("Exodoncia", 60),
            new DemoProcedure("Instalación de brackets", 90));

    private final RegisterUserUseCase registerUser;
    private final ListUsersUseCase listUsers;
    private final RegisterDentistUseCase registerDentist;
    private final ListDentistsUseCase listDentists;
    private final AddScheduleUseCase addSchedule;
    private final ListSchedulesUseCase listSchedules;
    private final RegisterProcedureUseCase registerProcedure;
    private final ListProceduresUseCase listProcedures;

    public DemoDataSeeder(
            RegisterUserUseCase registerUser,
            ListUsersUseCase listUsers,
            RegisterDentistUseCase registerDentist,
            ListDentistsUseCase listDentists,
            AddScheduleUseCase addSchedule,
            ListSchedulesUseCase listSchedules,
            RegisterProcedureUseCase registerProcedure,
            ListProceduresUseCase listProcedures) {
        this.registerUser = registerUser;
        this.listUsers = listUsers;
        this.registerDentist = registerDentist;
        this.listDentists = listDentists;
        this.addSchedule = addSchedule;
        this.listSchedules = listSchedules;
        this.registerProcedure = registerProcedure;
        this.listProcedures = listProcedures;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserSummary auxiliar = ensureUser("Ana María Rueda", "ana@villadent.co", Role.AUXILIAR);
        UserSummary dentistUser = ensureUser(
                "Dra. Laura Villamizar", "laura@villadent.co", Role.ODONTOLOGO);

        DentistResult laura = ensureDentist(
                "Dra. Laura Villamizar", "Odontología general", dentistUser.id());
        DentistResult andres = ensureDentist("Dr. Andrés Peña", "Ortodoncia", null);
        DentistResult camila = ensureDentist("Dra. Camila Ortiz", "Cirugía oral", null);

        ensureSchedules(laura);
        ensureSchedules(andres);
        ensureSchedules(camila);

        for (DemoProcedure procedure : PROCEDURES) {
            ensureProcedure(procedure);
        }
        LOG.info("Demo data ready (auxiliar: {})", auxiliar.email());
    }

    private UserSummary ensureUser(String name, String email, Role role) {
        return listUsers.list().stream()
                .filter(user -> user.email().equals(email))
                .findFirst()
                .orElseGet(() -> registerUser.register(
                        new RegisterUserCommand(name, email, DEMO_PASSWORD, role)));
    }

    private DentistResult ensureDentist(String name, String specialty, Long userId) {
        return listDentists.list().stream()
                .filter(dentist -> dentist.name().equals(name))
                .findFirst()
                .orElseGet(() -> registerDentist.register(
                        new RegisterDentistCommand(name, specialty, userId)));
    }

    private void ensureSchedules(DentistResult dentist) {
        List<ScheduleResult> existing = listSchedules.listByDentist(dentist.id());
        for (int day = 1; day <= 6; day++) {
            int scheduleDay = day;
            for (Shift shift : SHIFTS) {
                boolean present = existing.stream().anyMatch(schedule ->
                        schedule.dayOfWeek() == scheduleDay
                                && schedule.start().equals(shift.start())
                                && schedule.end().equals(shift.end()));
                if (!present) {
                    addSchedule.add(new AddScheduleCommand(
                            dentist.id(), day, shift.start(), shift.end()));
                }
            }
        }
    }

    private void ensureProcedure(DemoProcedure procedure) {
        boolean present = listProcedures.list().stream()
                .anyMatch(candidate -> candidate.name().equals(procedure.name()));
        if (!present) {
            registerProcedure.register(
                    new RegisterProcedureCommand(procedure.name(), procedure.durationMinutes()));
        }
    }

    private record Shift(LocalTime start, LocalTime end) {
    }

    private record DemoProcedure(String name, int durationMinutes) {
    }
}
