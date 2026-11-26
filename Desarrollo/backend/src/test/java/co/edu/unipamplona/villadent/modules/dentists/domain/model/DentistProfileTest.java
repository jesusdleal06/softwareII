package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DentistProfileTest {
    @Test
    @DisplayName("CP-RF11-02: requires first name and first surname")
    void requiredNames() {
        assertThatThrownBy(() -> profile(" ", "Peña", List.of("Dentistry"), "Profile"))
                .hasMessage("El primer nombre es obligatorio.");
        assertThatThrownBy(() -> profile("Laura", null, List.of("Dentistry"), "Profile"))
                .hasMessage("El primer apellido es obligatorio.");
    }

    @Test
    @DisplayName("CP-RF11-03: skips absent optional names")
    void optionalNames() {
        var dentist = profile(" Laura ", " Peña ", List.of("Dentistry"), "Profile");
        assertThat(dentist.name()).isEqualTo("Laura Peña");
        assertThat(dentist.profile().secondName()).isNull();
        assertThat(dentist.profile().secondSurname()).isNull();
    }

    @Test
    @DisplayName("CP-RF11-04: requires a title and limits the description")
    void titleAndDescription() {
        assertThatThrownBy(() -> profile("Laura", "Peña", List.of(" "), "Profile"))
                .hasMessage("Agrega al menos un título académico.");
        assertThatThrownBy(() -> profile("Laura", "Peña", List.of("Dentistry"), "x".repeat(501)))
                .hasMessage("La descripción no puede superar 500 caracteres.");
        assertThatThrownBy(() -> profile("Laura", "Peña", List.of("Dentistry"), " "))
                .hasMessage("La descripción es obligatoria.");
    }

    @Test
    @DisplayName("CP-RF11-10: a prefix-only legacy name keeps a non-empty first name")
    void prefixOnlyLegacyName() {
        var profile = DentistProfile.fromLegacyName("  Dra.  ");

        assertThat(profile.firstName()).isEqualTo("Dra.");
        assertThat(profile.firstSurname()).isNull();
    }

    private Dentist profile(String firstName, String surname, List<String> titles, String description) {
        return Dentist.create("Before Edit", null, null)
                .updateProfile(firstName, " ", surname, null, titles, description);
    }
}
