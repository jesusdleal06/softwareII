package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase.RegisterProcedureCommand;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CentralMapperConfig.class)
public interface ProcedureWebMapper {

    RegisterProcedureCommand toCommand(RegisterProcedureRequest request);

    ProcedureResponse toResponse(ProcedureResult result);

    PublicProcedureResponse toPublicResponse(ProcedureResult result);
}
