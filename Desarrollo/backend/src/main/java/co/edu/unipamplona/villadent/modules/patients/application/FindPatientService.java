package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class FindPatientService implements FindPatientUseCase {

    private final PatientRepository patients;

    public FindPatientService(PatientRepository patients) {
        this.patients = patients;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PatientResult> findById(Long id) {
        return patients.findById(id).map(RegisterPatientService::toResult);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PatientResult> findByPhone(String phone) {
        return patients.findByPhone(phone).map(RegisterPatientService::toResult);
    }
}
