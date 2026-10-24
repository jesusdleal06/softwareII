package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentJpaRepository extends JpaRepository<AppointmentJpaEntity, Long> {

    List<AppointmentJpaEntity> findByDentistIdAndDate(Long dentistId, LocalDate date);

    List<AppointmentJpaEntity> findByDate(LocalDate date);

    Optional<AppointmentJpaEntity> findByTokenHash(String tokenHash);

    @Query("""
            select appointment from AppointmentJpaEntity appointment
            where appointment.date between :from and :to
              and (:dentistId is null or appointment.dentistId = :dentistId)
            order by appointment.date, appointment.time, appointment.id
            """)
    List<AppointmentJpaEntity> findForReport(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("dentistId") Long dentistId);

    long countByDentistIdAndDateGreaterThanEqualAndStatusIn(
            Long dentistId, LocalDate date, Collection<AppointmentStatus> statuses);

    long countByPatientIdAndDateGreaterThanEqualAndStatusIn(
            Long patientId, LocalDate date, Collection<AppointmentStatus> statuses);

    @Query(value = "SELECT nextval('citas_codigo_seq')", nativeQuery = true)
    long nextCodeSequence();
}
