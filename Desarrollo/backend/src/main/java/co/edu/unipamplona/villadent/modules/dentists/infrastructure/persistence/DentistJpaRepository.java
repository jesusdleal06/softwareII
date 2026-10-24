package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DentistJpaRepository extends JpaRepository<DentistJpaEntity, Long> {

    Optional<DentistJpaEntity> findByUserId(Long userId);
}
