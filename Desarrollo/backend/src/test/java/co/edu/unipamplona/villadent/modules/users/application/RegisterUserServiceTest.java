package co.edu.unipamplona.villadent.modules.users.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.users.domain.error.EmailAlreadyExistsException;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase.RegisterUserCommand;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RegisterUserServiceTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordHasher passwordHasher;

    private RegisterUserService service;

    @BeforeEach
    void setUp() {
        service = new RegisterUserService(users, passwordHasher);
    }

    @Test
    void storesTheHashAndNormalizesTheEmail() {
        when(users.findByEmail("ana@villadent.co")).thenReturn(Optional.empty());
        when(passwordHasher.hash("secret")).thenReturn("hash");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            return new User(7L, user.name(), user.email(), user.passwordHash(), user.role(), true);
        });

        var summary = service.register(new RegisterUserCommand(
                "Ana María", "  ANA@Villadent.CO ", "secret", Role.AUXILIAR));

        assertThat(summary.id()).isEqualTo(7L);
        assertThat(summary.email()).isEqualTo("ana@villadent.co");
        assertThat(summary.role()).isEqualTo(Role.AUXILIAR);
        verify(passwordHasher).hash("secret");
    }

    @Test
    void rejectsADuplicateEmailWithoutHashing() {
        when(users.findByEmail("ana@villadent.co")).thenReturn(Optional.of(
                new User(1L, "Ana", "ana@villadent.co", "hash", Role.AUXILIAR, true)));

        assertThatThrownBy(() -> service.register(new RegisterUserCommand(
                "Ana", "ana@villadent.co", "secret", Role.AUXILIAR)))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(passwordHasher, never()).hash(any());
    }
}
