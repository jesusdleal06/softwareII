package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

import java.util.Optional;

public interface FindPatientUseCase {

    Optional<PatientResult> findById(Long id);

    Optional<PatientResult> findByPhone(String phone);
}
