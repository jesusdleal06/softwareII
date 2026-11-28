package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class VerificationCodePersistenceAdapter implements VerificationCodeRepository {

    private final VerificationCodeJpaRepository codes;
    private final VerificationCodePersistenceMapper mapper;

    public VerificationCodePersistenceAdapter(
            VerificationCodeJpaRepository codes,
            VerificationCodePersistenceMapper mapper) {
        this.codes = codes;
        this.mapper = mapper;
    }

    @Override
    public PhoneVerificationCode save(PhoneVerificationCode code) {
        VerificationCodeJpaEntity entity = code.id() == null
                ? new VerificationCodeJpaEntity()
                : codes.findById(code.id()).orElseGet(VerificationCodeJpaEntity::new);
        mapper.updateEntity(code, entity);
        return mapper.toDomain(codes.save(entity));
    }

    @Override
    public Optional<PhoneVerificationCode> findLatestByPhone(String phone) {
        return codes.findFirstByPhoneOrderByIdDesc(phone).map(mapper::toDomain);
    }

    @Override
    public long countByPhoneSince(String phone, Instant since) {
        return codes.countByPhoneAndCreatedAtGreaterThanEqual(phone, since);
    }

    @Override
    public long countByClientIpSince(String clientIp, Instant since) {
        return codes.countByClientIpAndCreatedAtGreaterThanEqual(clientIp, since);
    }

    @Override
    public void invalidateActiveByPhone(String phone) {
        codes.invalidateActiveByPhone(phone);
    }

    @Override
    public Optional<PhoneVerificationCode> registerWrongAttempt(Long id, Instant now) {
        int updated = codes.incrementAttempts(id, PhoneVerificationCode.MAX_ATTEMPTS, now);
        if (updated == 0) {
            return Optional.empty();
        }
        return codes.findById(id).map(mapper::toDomain);
    }

    @Override
    public boolean markUsedIfUsable(Long id, Instant now) {
        return codes.markUsedIfUsable(id, now) > 0;
    }

    @Override
    public void lockPhoneRequests(String phone) {
        codes.acquireTransactionLock("phone:" + phone);
    }

    @Override
    public void lockClientIpRequests(String clientIp) {
        codes.acquireTransactionLock("ip:" + clientIp);
    }
}
