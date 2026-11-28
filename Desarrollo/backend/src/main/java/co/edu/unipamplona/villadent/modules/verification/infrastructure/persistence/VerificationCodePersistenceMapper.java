package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface VerificationCodePersistenceMapper {

    @Mapping(target = "id", expression = "java(code.id())")
    @Mapping(target = "phone", expression = "java(code.phone())")
    @Mapping(target = "codeHash", expression = "java(code.codeHash())")
    @Mapping(target = "expiresAt", expression = "java(code.expiresAt())")
    @Mapping(target = "attempts", expression = "java(code.attempts())")
    @Mapping(target = "used", expression = "java(code.used())")
    @Mapping(target = "invalidated", expression = "java(code.invalidated())")
    @Mapping(target = "clientIp", expression = "java(code.clientIp())")
    @Mapping(target = "createdAt", expression = "java(code.createdAt())")
    void updateEntity(PhoneVerificationCode code, @MappingTarget VerificationCodeJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "phone", source = "entity.phone")
    @Mapping(target = "codeHash", source = "entity.codeHash")
    @Mapping(target = "expiresAt", source = "entity.expiresAt")
    @Mapping(target = "attempts", source = "entity.attempts")
    @Mapping(target = "used", source = "entity.used")
    @Mapping(target = "invalidated", source = "entity.invalidated")
    @Mapping(target = "clientIp", source = "entity.clientIp")
    @Mapping(target = "createdAt", source = "entity.createdAt")
    PhoneVerificationCode toDomain(VerificationCodeJpaEntity entity);
}
