package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface UpdateDentistIdentityUseCase {

    DentistResult updateIdentity(Long id, String name, String specialty);
}
