package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.RegisterStaffUseCase.RegisterStaffCommand;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.StaffSummary;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.UpdateStaffUseCase.UpdateStaffCommand;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CentralMapperConfig.class)
public interface StaffWebMapper {

    RegisterStaffCommand toCommand(RegisterStaffRequest request);

    UpdateStaffCommand toCommand(UpdateStaffRequest request);

    StaffResponse toResponse(StaffSummary summary);
}
