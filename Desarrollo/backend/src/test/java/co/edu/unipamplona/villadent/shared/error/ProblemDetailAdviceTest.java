package co.edu.unipamplona.villadent.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

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

    static final class TestDomainException extends DomainException {

        TestDomainException(String errorCode, String detail, int status) {
            super(errorCode, detail, status, null);
        }
    }
}
