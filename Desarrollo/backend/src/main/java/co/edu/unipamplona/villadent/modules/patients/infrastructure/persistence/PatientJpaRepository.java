package co.edu.unipamplona.villadent.modules.patients.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientJpaRepository extends JpaRepository<PatientJpaEntity, Long> {

    Optional<PatientJpaEntity> findByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select patient from PatientJpaEntity patient where patient.phone = :phone")
    Optional<PatientJpaEntity> findByPhoneForUpdate(@Param("phone") String phone);

    @Modifying
    @Query(value = """
            INSERT INTO pacientes (nombre_completo, telefono, activo)
            VALUES (:fullName, :phone, true)
            ON CONFLICT (telefono) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(@Param("fullName") String fullName, @Param("phone") String phone);
}
