package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface GetOwnDentistProfileUseCase {
    DentistResult get(Long userId);
}
