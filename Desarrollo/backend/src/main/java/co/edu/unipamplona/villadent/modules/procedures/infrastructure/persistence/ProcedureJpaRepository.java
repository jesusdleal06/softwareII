package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcedureJpaRepository extends JpaRepository<ProcedureJpaEntity, Long> {

    Optional<ProcedureJpaEntity> findByNameIgnoreCase(String name);
}
