package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ListPatientsUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListPatientsService implements ListPatientsUseCase {

    private final PatientRepository patients;

    public ListPatientsService(PatientRepository patients) {
        this.patients = patients;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientResult> list() {
        return patients.findAll().stream().map(RegisterPatientService::toResult).toList();
    }
}
