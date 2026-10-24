package co.edu.unipamplona.villadent.modules.patients.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientJpaRepository extends JpaRepository<PatientJpaEntity, Long> {

    Optional<PatientJpaEntity> findByPhone(String phone);
}
