package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationTokenRepository;
import java.time.Instant;
import org.springframework.stereotype.Repository;

@Repository
public class VerificationTokenPersistenceAdapter implements VerificationTokenRepository {

    private final VerificationTokenJpaRepository tokens;
    private final VerificationTokenPersistenceMapper mapper;

    public VerificationTokenPersistenceAdapter(
            VerificationTokenJpaRepository tokens,
            VerificationTokenPersistenceMapper mapper) {
        this.tokens = tokens;
        this.mapper = mapper;
    }

    @Override
    public VerificationToken save(VerificationToken token) {
        VerificationTokenJpaEntity entity = token.id() == null
                ? new VerificationTokenJpaEntity()
                : tokens.findById(token.id()).orElseGet(VerificationTokenJpaEntity::new);
        mapper.updateEntity(token, entity);
        return mapper.toDomain(tokens.save(entity));
    }

    @Override
    public boolean consume(String tokenHash, String phone, Instant now) {
        return tokens.consume(tokenHash, phone, now) > 0;
    }
}
