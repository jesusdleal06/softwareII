package co.edu.unipamplona.villadent.modules.patients.infrastructure.web;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.RegisterPatientUseCase.RegisterPatientCommand;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CentralMapperConfig.class)
public interface PatientWebMapper {

    RegisterPatientCommand toCommand(RegisterPatientRequest request);

    PatientResponse toResponse(PatientResult result);
}
