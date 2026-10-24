package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidDentistDataException;
import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidScheduleException;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class DentistTest {

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
                .isInstanceOf(InvalidScheduleException.class);
    }

    @Test
    void rejectsAnOutOfRangeDay() {
        assertThatThrownBy(() -> Schedule.create(1L, 0, LocalTime.of(8, 0), LocalTime.of(12, 0)))
                .isInstanceOf(InvalidScheduleException.class);
    }

    @Test
    void createsAValidSchedule() {
        Schedule schedule = Schedule.create(1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0));

        assertThat(schedule.dayOfWeek()).isEqualTo(1);
        assertThat(schedule.start()).isEqualTo(LocalTime.of(8, 0));
        assertThat(schedule.isActive()).isTrue();
    }
}
