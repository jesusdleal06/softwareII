package co.edu.unipamplona.villadent.modules.users.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<UserJpaEntity, Long> {

    Optional<UserJpaEntity> findByEmailIgnoreCase(String email);

    boolean existsByRoleIdAndActiveTrue(Long roleId);
}
