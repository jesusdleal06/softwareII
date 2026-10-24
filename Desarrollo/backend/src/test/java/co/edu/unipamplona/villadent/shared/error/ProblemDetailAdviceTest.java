package co.edu.unipamplona.villadent.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.ActiveAppointmentExistsException;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;

class ProblemDetailAdviceTest {

    private final ProblemDetailAdvice advice = new ProblemDetailAdvice();

    @Test
    void mapsDomainExceptionToProblemDetail() {
        DomainException exception = new TestDomainException("SLOT_TAKEN", "Este horario acaba de ser ocupado. Por favor elige otro.", 409);

        ProblemDetail problemDetail = advice.handleDomainException(exception);

        assertThat(problemDetail.getStatus()).isEqualTo(409);
        assertThat(problemDetail.getDetail()).isEqualTo("Este horario acaba de ser ocupado. Por favor elige otro.");
        assertThat(problemDetail.getProperties().get("code")).isEqualTo("SLOT_TAKEN");
    }

    @Test
    @DisplayName("CP-RF07-02: maps an active appointment conflict to 409")
    void mapsActiveAppointmentConflict() {
        ProblemDetail problemDetail = advice.handleDomainException(new ActiveAppointmentExistsException());

        assertThat(problemDetail.getStatus()).isEqualTo(409);
        assertThat(problemDetail.getProperties().get("code")).isEqualTo("ACTIVE_APPOINTMENT_EXISTS");
        assertThat(problemDetail.getDetail()).isEqualTo(
                "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva.");
    }

    @Test
    @DisplayName("CP-RF07-03: maps a slot conflict to 409 with the public message")
    void mapsSlotConflict() {
        ProblemDetail problemDetail = advice.handleDomainException(
                new SlotTakenException("Este horario acaba de ser ocupado. Por favor elige otro."));

        assertThat(problemDetail.getStatus()).isEqualTo(409);
        assertThat(problemDetail.getProperties().get("code")).isEqualTo("SLOT_TAKEN");
        assertThat(problemDetail.getDetail()).isEqualTo(
                "Este horario acaba de ser ocupado. Por favor elige otro.");
    }

    static final class TestDomainException extends DomainException {

        TestDomainException(String errorCode, String detail, int status) {
            super(errorCode, detail, status, null);
        }
    }
}
