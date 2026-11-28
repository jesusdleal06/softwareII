package co.edu.unipamplona.villadent.modules.verification.infrastructure.persistence;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VerificationTokenJpaRepository
        extends JpaRepository<VerificationTokenJpaEntity, Long> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update VerificationTokenJpaEntity token
               set token.usedAt = :now
             where token.tokenHash = :tokenHash
               and token.phone = :phone
               and token.usedAt is null
               and token.expiresAt > :now
            """)
    int consume(
            @Param("tokenHash") String tokenHash,
            @Param("phone") String phone,
            @Param("now") Instant now);
}
