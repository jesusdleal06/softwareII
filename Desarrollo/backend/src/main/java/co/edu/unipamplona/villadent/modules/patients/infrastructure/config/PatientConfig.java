package co.edu.unipamplona.villadent.modules.patients.infrastructure.config;

import co.edu.unipamplona.villadent.modules.patients.application.FindPatientService;
import co.edu.unipamplona.villadent.modules.patients.application.ListPatientsService;
import co.edu.unipamplona.villadent.modules.patients.application.RegisterPatientService;
import co.edu.unipamplona.villadent.modules.patients.application.SetPatientActiveService;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ListPatientsUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.RegisterPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.SetPatientActiveUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PatientConfig {

    @Bean
    public RegisterPatientUseCase registerPatientUseCase(PatientRepository patients) {
        return new RegisterPatientService(patients);
    }

    @Bean
    public ListPatientsUseCase listPatientsUseCase(PatientRepository patients) {
        return new ListPatientsService(patients);
    }

    @Bean
    public FindPatientUseCase findPatientUseCase(PatientRepository patients) {
        return new FindPatientService(patients);
    }

    @Bean
    public SetPatientActiveUseCase setPatientActiveUseCase(PatientRepository patients) {
        return new SetPatientActiveService(patients);
    }
}
