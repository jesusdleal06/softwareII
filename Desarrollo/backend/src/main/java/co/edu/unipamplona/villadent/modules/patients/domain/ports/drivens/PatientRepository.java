package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import java.util.List;
import java.util.Optional;

public interface PatientRepository {

    Optional<Patient> findById(Long id);

    Optional<Patient> findByPhone(String phone);

    Optional<Patient> findByPhoneForUpdate(String phone);

    void createIfAbsent(String fullName, String phone);

    List<Patient> findAll();

    Patient save(Patient patient);
}
