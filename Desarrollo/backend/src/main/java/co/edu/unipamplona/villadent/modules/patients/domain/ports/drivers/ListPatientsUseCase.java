package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

import java.util.List;

public interface ListPatientsUseCase {

    List<PatientResult> list();
}
