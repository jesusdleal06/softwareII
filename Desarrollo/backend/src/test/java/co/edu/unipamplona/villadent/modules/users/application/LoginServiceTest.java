package co.edu.unipamplona.villadent.modules.users.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.users.domain.error.InvalidCredentialsException;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase.LoginCommand;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.IssuedToken;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.TokenGenerator;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoginServiceTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordHasher passwordHasher;

    @Mock
    private TokenGenerator tokenGenerator;

    private LoginService service;

    @BeforeEach
    void setUp() {
        service = new LoginService(users, passwordHasher, tokenGenerator);
    }

    @Test
    @DisplayName("CP-RF09-02: a wrong password opens no session")
    void wrongPasswordRejectsLogin() {
        User user = new User(1L, "Ana", "ana@villadent.co", "hash", Role.AUXILIAR, true);
        when(users.findByEmail("ana@villadent.co")).thenReturn(Optional.of(user));
        when(passwordHasher.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginCommand("ana@villadent.co", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage(InvalidCredentialsException.MESSAGE);

        verify(tokenGenerator, never()).issue(user);
    }

    @Test
    @DisplayName("CP-RF09-01: a valid login returns a token for the account role")
    void validLoginReturnsToken() {
        User user = new User(1L, "Ana", "ana@villadent.co", "hash", Role.AUXILIAR, true);
        IssuedToken token = new IssuedToken("jwt", Instant.parse("2026-10-23T20:00:00Z"), 28800);
        when(users.findByEmail("ana@villadent.co")).thenReturn(Optional.of(user));
        when(passwordHasher.matches("secret", "hash")).thenReturn(true);
        when(tokenGenerator.issue(user)).thenReturn(token);

        var result = service.login(new LoginCommand("ana@villadent.co", "secret"));

        assertThat(result.token()).isEqualTo("jwt");
        assertThat(result.expiresInSeconds()).isEqualTo(28800);
        assertThat(result.user()).isSameAs(user);
    }

    @Test
    void inactiveUserCannotSignIn() {
        User user = new User(1L, "Ana", "ana@villadent.co", "hash", Role.AUXILIAR, false);
        when(users.findByEmail("ana@villadent.co")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.login(new LoginCommand("ana@villadent.co", "secret")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(passwordHasher, never()).matches("secret", "hash");
    }

    @Test
    void unknownEmailCannotSignIn() {
        when(users.findByEmail("nobody@villadent.co")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginCommand("nobody@villadent.co", "secret")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
