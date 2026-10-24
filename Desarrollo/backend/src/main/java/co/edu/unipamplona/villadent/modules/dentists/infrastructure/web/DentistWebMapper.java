package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase.AddScheduleCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase.RegisterDentistCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface DentistWebMapper {

    RegisterDentistCommand toCommand(RegisterDentistRequest request);

    DentistResponse toResponse(DentistResult result);

    PublicDentistResponse toPublicResponse(DentistResult result);

    @Mapping(target = "dentistId", source = "dentistId")
    AddScheduleCommand toCommand(Long dentistId, RegisterScheduleRequest request);

    ScheduleResponse toResponse(ScheduleResult result);
}
