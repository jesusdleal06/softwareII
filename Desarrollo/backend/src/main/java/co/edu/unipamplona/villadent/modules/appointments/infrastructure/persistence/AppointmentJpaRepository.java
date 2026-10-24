package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentJpaRepository extends JpaRepository<AppointmentJpaEntity, Long> {

    List<AppointmentJpaEntity> findByDentistIdAndDate(Long dentistId, LocalDate date);

    long countByDentistIdAndDateGreaterThanEqualAndStatusIn(
            Long dentistId, LocalDate date, Collection<AppointmentStatus> statuses);
}
