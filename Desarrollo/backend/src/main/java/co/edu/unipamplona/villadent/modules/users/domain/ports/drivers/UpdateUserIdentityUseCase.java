package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

public interface UpdateUserIdentityUseCase {

    UserSummary updateIdentity(Long id, UpdateUserIdentityCommand command);

    record UpdateUserIdentityCommand(String name, String email) {
    }
}
