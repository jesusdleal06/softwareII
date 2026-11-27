package co.edu.unipamplona.villadent.modules.procedures.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.procedures.domain.error.InvalidProcedureDataException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProcedureTest {

    @Test
    @DisplayName("accepts the durations from the prototype")
    void acceptsTheDurationsFromThePrototype() {
        for (int duration : new int[] {30, 45, 60, 90}) {
            assertThat(Procedure.create("Procedimiento", duration).durationMinutes()).isEqualTo(duration);
        }
    }

    @Test
    @DisplayName("CP-RF12-02: a duration outside 30, 45, 60 or 90 minutes is rejected")
    void rejectsAnUnsupportedDuration() {
        assertThatThrownBy(() -> Procedure.create("Procedimiento", 20))
                .isInstanceOf(InvalidProcedureDataException.class)
                .hasMessage("La duración del procedimiento debe ser 30, 45, 60 o 90 minutos.");
    }

    @Test
    @DisplayName("rejects a blank name")
    void rejectsABlankName() {
        assertThatThrownBy(() -> Procedure.create(" ", 30))
                .isInstanceOf(InvalidProcedureDataException.class);
    }
}
