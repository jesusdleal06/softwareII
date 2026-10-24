package co.edu.unipamplona.villadent.modules.users.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.users.domain.error.InvalidUserDataException;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    void normalizesTheEmail() {
        User user = User.create("Ana", "  ANA@Villadent.CO ", "hash", Role.AUXILIAR);

        assertThat(user.email()).isEqualTo("ana@villadent.co");
        assertThat(user.isActive()).isTrue();
    }

    @Test
    void rejectsABlankName() {
        assertThatThrownBy(() -> User.create(" ", "ana@villadent.co", "hash", Role.AUXILIAR))
                .isInstanceOf(InvalidUserDataException.class);
    }

    @Test
    void rejectsAnInvalidEmail() {
        assertThatThrownBy(() -> User.create("Ana", "not-an-email", "hash", Role.AUXILIAR))
                .isInstanceOf(InvalidUserDataException.class);
    }

    @Test
    void changeActiveKeepsThePasswordHash() {
        User user = new User(1L, "Ana", "ana@villadent.co", "hash", Role.AUXILIAR, true);

        User inactive = user.changeActive(false);

        assertThat(inactive.isActive()).isFalse();
        assertThat(inactive.passwordHash()).isEqualTo("hash");
    }
}
