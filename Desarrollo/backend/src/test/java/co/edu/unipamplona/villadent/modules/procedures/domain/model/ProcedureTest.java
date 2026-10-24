package co.edu.unipamplona.villadent.modules.procedures.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.procedures.domain.error.InvalidProcedureDataException;
import org.junit.jupiter.api.Test;

class ProcedureTest {

    @Test
    void acceptsTheDurationsFromThePrototype() {
        for (int duration : new int[] {30, 45, 60, 90}) {
            assertThat(Procedure.create("Procedimiento", duration).durationMinutes()).isEqualTo(duration);
        }
    }

    @Test
    void rejectsAnUnsupportedDuration() {
        assertThatThrownBy(() -> Procedure.create("Procedimiento", 20))
                .isInstanceOf(InvalidProcedureDataException.class);
    }

    @Test
    void rejectsABlankName() {
        assertThatThrownBy(() -> Procedure.create(" ", 30))
                .isInstanceOf(InvalidProcedureDataException.class);
    }
}
