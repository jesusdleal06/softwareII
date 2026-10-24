package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface SetDentistActiveUseCase {

    DentistResult setActive(Long id, boolean active);
}
