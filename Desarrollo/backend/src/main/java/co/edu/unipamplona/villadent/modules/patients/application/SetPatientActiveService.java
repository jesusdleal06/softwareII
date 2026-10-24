package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.SetPatientActiveUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class SetPatientActiveService implements SetPatientActiveUseCase {

    private final PatientRepository patients;

    public SetPatientActiveService(PatientRepository patients) {
        this.patients = patients;
    }

    @Override
    @Transactional
    public PatientResult setActive(Long id, boolean active) {
        Patient patient = patients.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el paciente."));
        return RegisterPatientService.toResult(patients.save(patient.changeActive(active)));
    }
}
