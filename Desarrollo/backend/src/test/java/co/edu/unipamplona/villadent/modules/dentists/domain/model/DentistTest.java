package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidDentistDataException;
import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidScheduleException;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class DentistTest {

    /** The clinic working hours (S1), as the patient reads them. */
    private static final String SATURDAY_CLOSED = "La clínica no atiende los sábados.";
    private static final String OUTSIDE_HOURS = "El horario debe quedar dentro de la jornada de la clínica: "
            + "lunes a viernes 08:00-12:00 y 14:00-18:00, domingo 08:00-13:00.";

    @Test
    void rejectsABlankDentistName() {
        assertThatThrownBy(() -> Dentist.create(" ", "Ortodoncia", null))
                .isInstanceOf(InvalidDentistDataException.class);
    }

    @Test
    void normalizesTheNameAndSpecialty() {
        Dentist dentist = Dentist.create("  Laura   Villamizar ", " Odontología  general ", null);

        assertThat(dentist.name()).isEqualTo("Laura Villamizar");
        assertThat(dentist.specialty()).isEqualTo("Odontología general");
    }

    @Test
    void rejectsAScheduleThatEndsBeforeItStarts() {
        assertThatThrownBy(() -> Schedule.create(1L, 1, LocalTime.of(12, 0), LocalTime.of(8, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage("La hora de fin debe ser posterior a la hora de inicio.");
    }

    @Test
    void rejectsAnOutOfRangeDay() {
        assertThatThrownBy(() -> Schedule.create(1L, 0, LocalTime.of(8, 0), LocalTime.of(12, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage("El día de la semana debe estar entre 1 y 7.");
    }

    @Test
    void rejectsAScheduleWithoutADentist() {
        assertThatThrownBy(() -> Schedule.create(null, 1, LocalTime.of(8, 0), LocalTime.of(12, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage("El odontólogo del horario es obligatorio.");
    }

    @Test
    void acceptsTheWeekdayShifts() {
        for (int day = 1; day <= 5; day++) {
            Schedule morning = Schedule.create(1L, day, LocalTime.of(8, 0), LocalTime.of(12, 0));
            Schedule afternoon = Schedule.create(1L, day, LocalTime.of(14, 0), LocalTime.of(18, 0));

            assertThat(morning.dayOfWeek()).isEqualTo(day);
            assertThat(afternoon.end()).isEqualTo(LocalTime.of(18, 0));
        }
    }

    @Test
    void rejectsAWeekdayWindowAcrossTheLunchBreak() {
        assertThatThrownBy(() -> Schedule.create(1L, 1, LocalTime.of(11, 0), LocalTime.of(15, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage(OUTSIDE_HOURS);
    }

    @Test
    void rejectsAWeekdayWindowBeforeOpening() {
        assertThatThrownBy(() -> Schedule.create(1L, 3, LocalTime.of(7, 0), LocalTime.of(11, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage(OUTSIDE_HOURS);
    }

    @Test
    void rejectsAWeekdayWindowAfterClosing() {
        assertThatThrownBy(() -> Schedule.create(1L, 1, LocalTime.of(16, 0), LocalTime.of(18, 30)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage(OUTSIDE_HOURS);
    }

    @Test
    void acceptsTheSundayMorningWindow() {
        Schedule sunday = Schedule.create(1L, 7, LocalTime.of(8, 0), LocalTime.of(13, 0));

        assertThat(sunday.dayOfWeek()).isEqualTo(7);
        assertThat(sunday.start()).isEqualTo(LocalTime.of(8, 0));
        assertThat(sunday.end()).isEqualTo(LocalTime.of(13, 0));
    }

    @Test
    void rejectsASundayWindowAfterOnePm() {
        assertThatThrownBy(() -> Schedule.create(1L, 7, LocalTime.of(8, 0), LocalTime.of(14, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage(OUTSIDE_HOURS);
    }

    @Test
    void rejectsASaturdaySchedule() {
        assertThatThrownBy(() -> Schedule.create(1L, 6, LocalTime.of(8, 0), LocalTime.of(12, 0)))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessage(SATURDAY_CLOSED);
    }

    @Test
    void createsAValidSchedule() {
        Schedule schedule = Schedule.create(1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0));

        assertThat(schedule.dayOfWeek()).isEqualTo(1);
        assertThat(schedule.start()).isEqualTo(LocalTime.of(8, 0));
        assertThat(schedule.isActive()).isTrue();
    }
}
