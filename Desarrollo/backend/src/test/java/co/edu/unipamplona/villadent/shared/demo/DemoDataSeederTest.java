package co.edu.unipamplona.villadent.shared.demo;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
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

        DentistResult laura = dentists.list().stream()
                .filter(dentist -> dentist.name().equals("Dra. Laura Villamizar"))
                .findFirst()
                .orElseThrow();
        int schedulesBefore = schedules.listByDentist(laura.id()).size();
        assertThat(schedulesBefore).isGreaterThanOrEqualTo(12);

        seeder.run(new DefaultApplicationArguments(new String[0]));

        assertThat(users.list()).extracting(user -> user.email())
                .containsOnlyOnce("ana@villadent.co", "laura@villadent.co");
        assertThat(schedules.listByDentist(laura.id())).hasSize(schedulesBefore);
        assertThat(dentists.list()).extracting(DentistResult::name)
                .containsOnlyOnce("Dra. Laura Villamizar", "Dr. Andrés Peña", "Dra. Camila Ortiz");
    }
}
