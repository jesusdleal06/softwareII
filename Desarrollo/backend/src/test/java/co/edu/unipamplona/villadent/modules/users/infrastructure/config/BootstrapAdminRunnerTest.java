package co.edu.unipamplona.villadent.modules.users.infrastructure.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;

@ExtendWith(MockitoExtension.class)
class BootstrapAdminRunnerTest {

    private static final String EMAIL = "admin@villadent.co";
    private static final String PASSWORD = "una-clave-larga";

    @Mock
    private UserRepository users;

    @Mock
    private PasswordHasher passwordHasher;

    private final DefaultApplicationArguments arguments = new DefaultApplicationArguments(new String[0]);

    private BootstrapAdminRunner runner(BootstrapAdminSettings settings) {
        return new BootstrapAdminRunner(settings, users, passwordHasher);
    }

    @Test
    @DisplayName("Bootstrap creates the first AUXILIAR when none is active")
    void createsTheFirstAdmin() {
        when(users.existsActiveByRole(Role.AUXILIAR)).thenReturn(false);
        when(users.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(passwordHasher.hash(PASSWORD)).thenReturn("hash");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        runner(new BootstrapAdminSettings(true, EMAIL, PASSWORD, "Administradora")).run(arguments);

        verify(passwordHasher).hash(PASSWORD);
        verify(users).save(any(User.class));
    }

    @Test
    @DisplayName("Bootstrap does nothing when an active AUXILIAR already exists")
    void doesNotDuplicateTheAdmin() {
        when(users.existsActiveByRole(Role.AUXILIAR)).thenReturn(true);

        runner(new BootstrapAdminSettings(true, EMAIL, PASSWORD, "Administradora")).run(arguments);

        verify(users, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Bootstrap never changes the password of an existing email")
    void doesNotChangeAnExistingPassword() {
        when(users.existsActiveByRole(Role.AUXILIAR)).thenReturn(false);
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(
                new User(1L, "Ana", EMAIL, "old-hash", Role.AUXILIAR, false)));

        runner(new BootstrapAdminSettings(true, EMAIL, PASSWORD, "Administradora")).run(arguments);

        verify(passwordHasher, never()).hash(any());
        verify(users, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Bootstrap is a no-op when the variables are missing")
    void missingVariablesDoNothing() {
        runner(new BootstrapAdminSettings(true, "", "", "Administradora")).run(arguments);

        verify(users, never()).existsActiveByRole(any());
        verify(users, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Bootstrap rejects a short password without leaking it")
    void rejectsAShortPassword() {
        BootstrapAdminRunner runner = runner(new BootstrapAdminSettings(true, EMAIL, "short", "Administradora"));

        assertThatThrownBy(() -> runner.run(arguments))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("12")
                .hasMessageNotContaining("short");
        verify(users, never()).save(any(User.class));
    }

    @Test
    void disabledBootstrapDoesNothing() {
        runner(new BootstrapAdminSettings(false, EMAIL, PASSWORD, "Administradora")).run(arguments);

        verify(users, never()).existsActiveByRole(any());
        verify(users, never()).save(any(User.class));
    }
}
