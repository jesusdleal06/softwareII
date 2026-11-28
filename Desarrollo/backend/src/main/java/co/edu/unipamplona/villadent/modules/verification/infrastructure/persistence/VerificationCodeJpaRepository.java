package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VerificationCodeJpaRepository
        extends JpaRepository<VerificationCodeJpaEntity, Long> {

    Optional<VerificationCodeJpaEntity> findFirstByPhoneOrderByIdDesc(String phone);

    long countByPhoneAndCreatedAtGreaterThanEqual(String phone, Instant since);

    long countByClientIpAndCreatedAtGreaterThanEqual(String clientIp, Instant since);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update VerificationCodeJpaEntity code
               set code.invalidated = true
             where code.phone = :phone
               and code.used = false
               and code.invalidated = false
            """)
    int invalidateActiveByPhone(@Param("phone") String phone);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update VerificationCodeJpaEntity code
               set code.attempts = code.attempts + 1,
                   code.invalidated = case when code.attempts + 1 >= :maxAttempts then true else false end
             where code.id = :id
               and code.used = false
               and code.invalidated = false
               and code.attempts < :maxAttempts
               and code.expiresAt > :now
            """)
    int incrementAttempts(
            @Param("id") Long id,
            @Param("maxAttempts") int maxAttempts,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update VerificationCodeJpaEntity code
               set code.used = true
             where code.id = :id
               and code.used = false
               and code.invalidated = false
               and code.expiresAt > :now
            """)
    int markUsedIfUsable(@Param("id") Long id, @Param("now") Instant now);

    @Query(value = "select pg_advisory_xact_lock(hashtext(:key))", nativeQuery = true)
    void acquireTransactionLock(@Param("key") String key);
}
