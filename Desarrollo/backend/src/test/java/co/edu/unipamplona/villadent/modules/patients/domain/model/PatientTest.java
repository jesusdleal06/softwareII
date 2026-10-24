package co.edu.unipamplona.villadent.modules.patients.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.patients.domain.error.InvalidPatientDataException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PatientTest {

    @Test
    @DisplayName("CP-RF02-02: a blank name is rejected with the prototype message")
    void blankNameIsRejected() {
        assertThatThrownBy(() -> Patient.create(" ", "3001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.NAME_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-02: a single word is not a full name")
    void singleWordNameIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana", "3001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.FULL_NAME_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-03: a blank phone is rejected")
    void blankPhoneIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", " "))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-03: a phone with fewer than 10 digits is rejected")
    void shortPhoneIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", "300123456"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_LENGTH);
    }

    @Test
    @DisplayName("CP-RF02-03: a phone that does not start with 3 is rejected")
    void wrongPrefixIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", "2001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_PREFIX);
    }

    @Test
    void normalizesSpacesAndThePhone() {
        Patient patient = Patient.create("  Ana   María   Rueda ", "300 123 4567");

        assertThat(patient.fullName()).isEqualTo("Ana María Rueda");
        assertThat(patient.phone()).isEqualTo("3001234567");
        assertThat(patient.isActive()).isTrue();
    }
}
