package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface VerificationTokenPersistenceMapper {

    @Mapping(target = "id", expression = "java(token.id())")
    @Mapping(target = "tokenHash", expression = "java(token.tokenHash())")
    @Mapping(target = "phone", expression = "java(token.phone())")
    @Mapping(target = "expiresAt", expression = "java(token.expiresAt())")
    @Mapping(target = "usedAt", expression = "java(token.usedAt())")
    @Mapping(target = "createdAt", expression = "java(token.createdAt())")
    void updateEntity(VerificationToken token, @MappingTarget VerificationTokenJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "tokenHash", source = "entity.tokenHash")
    @Mapping(target = "phone", source = "entity.phone")
    @Mapping(target = "expiresAt", source = "entity.expiresAt")
    @Mapping(target = "usedAt", source = "entity.usedAt")
    @Mapping(target = "createdAt", source = "entity.createdAt")
    VerificationToken toDomain(VerificationTokenJpaEntity entity);
}
