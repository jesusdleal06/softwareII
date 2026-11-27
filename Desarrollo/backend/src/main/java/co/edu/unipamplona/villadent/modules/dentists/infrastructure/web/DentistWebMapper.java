package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase.AddScheduleCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase.RegisterDentistCommand;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateOwnDentistProfileUseCase.ProfileUpdate;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface DentistWebMapper {

    @Mapping(target = "initialProfile", ignore = true)
    RegisterDentistCommand toCommand(RegisterDentistRequest request);

    DentistResponse toResponse(DentistResult result);

    @Mapping(target = ".", source = "profile")
    PublicDentistResponse toPublicResponse(DentistResult result);

    @Mapping(target = ".", source = "profile")
    @Mapping(target = "fullName", source = "name")
    DentistProfileResponse toProfileResponse(DentistResult result);

    ProfileUpdate toCommand(UpdateDentistProfileRequest request);

    @Mapping(target = "dentistId", source = "dentistId")
    AddScheduleCommand toCommand(Long dentistId, RegisterScheduleRequest request);

    ScheduleResponse toResponse(ScheduleResult result);
}
