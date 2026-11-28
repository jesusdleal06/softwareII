package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.RequestVerificationCodeUseCase.RequestCodeCommand;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase.VerificationResult;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase.VerifyCodeCommand;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface VerificationWebMapper {

    @Mapping(target = "phone", source = "request.phone")
    @Mapping(target = "clientIp", source = "clientIp")
    RequestCodeCommand toCommand(RequestCodeRequest request, String clientIp);

    VerifyCodeCommand toCommand(VerifyCodeRequest request);

    VerifyCodeResponse toResponse(VerificationResult result);
}
