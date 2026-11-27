package co.edu.unipamplona.villadent.shared.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@ActiveProfiles("demo")
class DemoDataSeederTest {

    /** Monday to Friday with both shifts, plus Sunday morning: the clinic working hours (S1). */
    private static final int SHIFTS_PER_DENTIST = 5 * 2 + 1;

    @Autowired
    private DemoDataSeeder seeder;

    @Autowired
    private ListUsersUseCase users;

    @Autowired
    private ListDentistsUseCase dentists;

    @Autowired
    private ListSchedulesUseCase schedules;

    @Autowired
    private ListProceduresUseCase procedures;

    @Test
    void seedsThePrototypeDataAndCanRunAgain() throws Exception {
        assertThat(users.list()).extracting(user -> user.email())
                .contains("ana@villadent.co", "laura@villadent.co");
        assertThat(dentists.list()).extracting(DentistResult::name)
                .contains("Dra. Laura Villamizar", "Dr. Andrés Peña", "Dra. Camila Ortiz");
        assertThat(procedures.list()).extracting(procedure -> procedure.name())
                .contains("Limpieza", "Calza (resina)", "Valoración", "Exodoncia",
                        "Instalación de brackets");

        DentistResult laura = dentist("Dra. Laura Villamizar");
        int schedulesBefore = schedules.listByDentist(laura.id()).size();
        assertThat(schedulesBefore).isEqualTo(SHIFTS_PER_DENTIST);

        seeder.run(new DefaultApplicationArguments(new String[0]));

        assertThat(users.list()).extracting(user -> user.email())
                .containsOnlyOnce("ana@villadent.co", "laura@villadent.co");
        assertThat(schedules.listByDentist(laura.id())).hasSize(schedulesBefore);
        assertThat(dentists.list()).extracting(DentistResult::name)
                .containsOnlyOnce("Dra. Laura Villamizar", "Dr. Andrés Peña", "Dra. Camila Ortiz");
    }

    @Test
    void seedsTheClinicWorkingHoursAndNeverSaturday() {
        for (String name : List.of("Dra. Laura Villamizar", "Dr. Andrés Peña", "Dra. Camila Ortiz")) {
            List<ScheduleResult> shifts = schedules.listByDentist(dentist(name).id());

            assertThat(shifts).as("horarios de %s", name).hasSize(SHIFTS_PER_DENTIST);
            // Sábado cerrado: ni un solo horario, ni activo ni inactivo.
            assertThat(shifts).as("horarios de %s", name)
                    .noneMatch(schedule -> schedule.dayOfWeek() == 6);
            assertThat(shifts).as("domingo de %s", name)
                    .filteredOn(schedule -> schedule.dayOfWeek() == 7)
                    .extracting(ScheduleResult::start, ScheduleResult::end)
                    .containsExactly(tuple(LocalTime.of(8, 0), LocalTime.of(13, 0)));
        }
    }

    private DentistResult dentist(String name) {
        return dentists.list().stream()
                .filter(dentist -> dentist.name().equals(name))
                .findFirst()
                .orElseThrow();
    }
}
