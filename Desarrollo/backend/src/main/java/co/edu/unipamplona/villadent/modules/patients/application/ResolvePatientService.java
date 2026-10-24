package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

/** Finds or creates the patient inside a booking, holding the phone row lock. */
public class ResolvePatientService implements ResolvePatientUseCase {

    private final PatientRepository patients;

    public ResolvePatientService(PatientRepository patients) {
        this.patients = patients;
    }

    @Override
    @Transactional
    public PatientResult resolve(ResolvePatientCommand command) {
        Patient candidate = Patient.create(command.fullName(), command.phone());
        Patient existing = patients.findByPhoneForUpdate(candidate.phone()).orElse(null);
        if (existing == null) {
            patients.createIfAbsent(candidate.fullName(), candidate.phone());
            existing = patients.findByPhoneForUpdate(candidate.phone())
                    .orElseThrow(() -> new NotFoundException("No se pudo registrar el paciente."));
        }
        if (!existing.isActive()) {
            existing = patients.save(existing.reactivate(candidate.fullName()));
        }
        return RegisterPatientService.toResult(existing);
    }
}
