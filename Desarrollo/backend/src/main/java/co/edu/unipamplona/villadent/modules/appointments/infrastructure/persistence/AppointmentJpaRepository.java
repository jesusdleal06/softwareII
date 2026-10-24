package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppointmentJpaRepository extends JpaRepository<AppointmentJpaEntity, Long> {

    List<AppointmentJpaEntity> findByDentistIdAndDate(Long dentistId, LocalDate date);

    List<AppointmentJpaEntity> findByDate(LocalDate date);

    long countByDentistIdAndDateGreaterThanEqualAndStatusIn(
            Long dentistId, LocalDate date, Collection<AppointmentStatus> statuses);

    long countByPatientIdAndDateGreaterThanEqualAndStatusIn(
            Long patientId, LocalDate date, Collection<AppointmentStatus> statuses);

    @Query(value = "SELECT nextval('citas_codigo_seq')", nativeQuery = true)
    long nextCodeSequence();
}
