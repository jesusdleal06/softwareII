package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.RegisterPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import org.springframework.transaction.annotation.Transactional;

public class RegisterPatientService implements RegisterPatientUseCase {

    private final PatientRepository patients;

    public RegisterPatientService(PatientRepository patients) {
        this.patients = patients;
    }

    @Override
    @Transactional
    public PatientResult register(RegisterPatientCommand command) {
        Patient candidate = Patient.create(command.fullName(), command.phone());
        return patients.findByPhone(candidate.phone())
                .map(existing -> reactivateOrReject(existing, candidate))
                .orElseGet(() -> toResult(patients.save(candidate)));
    }

    private PatientResult reactivateOrReject(Patient existing, Patient candidate) {
        if (existing.isActive()) {
            throw new ConflictException("PATIENT_ALREADY_EXISTS", "Ya existe un paciente con ese celular.");
        }
        return toResult(patients.save(existing.reactivate(candidate.fullName())));
    }

    static PatientResult toResult(Patient patient) {
        return new PatientResult(patient.id(), patient.fullName(), patient.phone(), patient.isActive());
    }
}
