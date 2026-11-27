package co.edu.unipamplona.villadent.shared.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import java.sql.Connection;
import java.time.LocalTime;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;

/**
 * The clinic working hours rule (S1) also reaches the databases that already hold the old
 * rows. The migration runs on a database shaped like those, twice, because nothing may be
 * deleted and re-running it must add nothing.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
class ClinicWorkingHoursMigrationTest {

    private static final Resource MIGRATION =
            new ClassPathResource("db/migration/V5__clinic_working_hours.sql");

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Test
    @DisplayName("S1: V5 closes Saturdays and opens the Sunday morning without deleting a row")
    void closesSaturdayAndOpensTheSundayMorning() throws Exception {
        long dentistId = insertDentist("Dra. Prueba Jornada");
        // An existing database, before this rule: Monday with both shifts and a Saturday open.
        insertShift(dentistId, 1, "08:00", "12:00", true);
        insertShift(dentistId, 1, "14:00", "18:00", true);
        insertShift(dentistId, 6, "08:00", "12:00", true);
        insertShift(dentistId, 6, "14:00", "18:00", true);
        int before = shifts(dentistId).size();

        runMigration();
        // Re-running it is a no-op: the Sunday shift is not added twice.
        runMigration();

        List<Shift> after = shifts(dentistId);
        assertThat(after).hasSize(before + 1);
        // Nothing is deleted: the Saturday rows stay as history, just not bookable.
        assertThat(after).filteredOn(shift -> shift.dayOfWeek() == 6)
                .hasSize(2)
                .allMatch(shift -> !shift.active());
        assertThat(after).filteredOn(Shift::active)
                .extracting(Shift::dayOfWeek, Shift::start, Shift::end)
                .containsExactly(
                        tuple(1, LocalTime.of(8, 0), LocalTime.of(12, 0)),
                        tuple(1, LocalTime.of(14, 0), LocalTime.of(18, 0)),
                        tuple(7, LocalTime.of(8, 0), LocalTime.of(13, 0)));
    }

    @Test
    @DisplayName("S1: the Saturday rows V5 deactivates can still be read back")
    void keepsTheDeactivatedSaturdayRowsReadable() throws Exception {
        long dentistId = insertDentist("Dra. Prueba Historial");
        insertShift(dentistId, 6, "08:00", "12:00", true);

        runMigration();

        List<Schedule> read = scheduleRepository.findByDentistId(dentistId);
        // History is kept: the deletion the schema forbids would also lose the record.
        assertThat(read).filteredOn(schedule -> schedule.dayOfWeek() == 6)
                .extracting(Schedule::start, Schedule::isActive)
                .containsExactly(tuple(LocalTime.of(8, 0), false));
        assertThat(read).filteredOn(Schedule::isActive)
                .extracting(Schedule::dayOfWeek, Schedule::start, Schedule::end)
                .containsExactly(tuple(7, LocalTime.of(8, 0), LocalTime.of(13, 0)));
    }

    private long insertDentist(String name) {
        return jdbc.queryForObject("""
                insert into odontologos (nombre, especialidad, activo)
                values (?, 'Odontología general', true)
                returning id_odontologo
                """, Long.class, name);
    }

    private void runMigration() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, MIGRATION);
        }
    }

    private void insertShift(long dentistId, int dayOfWeek, String start, String end, boolean active) {
        jdbc.update("""
                insert into horarios_odontologo (id_odontologo, dia_semana, hora_inicio, hora_fin, activo)
                values (?, ?, ?, ?, ?)
                """, dentistId, dayOfWeek, LocalTime.parse(start), LocalTime.parse(end), active);
    }

    private List<Shift> shifts(long dentistId) {
        return jdbc.query("""
                select dia_semana, hora_inicio, hora_fin, activo
                  from horarios_odontologo
                 where id_odontologo = ?
                 order by dia_semana, hora_inicio
                """,
                (rs, rowNumber) -> new Shift(
                        rs.getInt("dia_semana"),
                        rs.getTime("hora_inicio").toLocalTime(),
                        rs.getTime("hora_fin").toLocalTime(),
                        rs.getBoolean("activo")),
                dentistId);
    }

    private record Shift(int dayOfWeek, LocalTime start, LocalTime end, boolean active) {
    }
}
