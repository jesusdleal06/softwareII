package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

public interface SetUserActiveUseCase {

    UserSummary setActive(Long id, boolean active);
}
