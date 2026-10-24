package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;

@Repository
public class AppointmentPersistenceAdapter implements AppointmentRepository {

    private final AppointmentJpaRepository appointments;
    private final AppointmentPersistenceMapper mapper;

    @PersistenceContext
    private EntityManager entityManager;

    public AppointmentPersistenceAdapter(
            AppointmentJpaRepository appointments,
            AppointmentPersistenceMapper mapper) {
        this.appointments = appointments;
        this.mapper = mapper;
    }

    @Override
    public Optional<Appointment> findById(Long id) {
        return appointments.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<Appointment> findByDentistIdAndDate(Long dentistId, LocalDate date) {
        return appointments.findByDentistIdAndDate(dentistId, date).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<Appointment> findByDate(LocalDate date) {
        return appointments.findByDate(date).stream().map(mapper::toDomain).toList();
    }

    @Override
    public long countActiveFrom(Long dentistId, LocalDate from) {
        return appointments.countByDentistIdAndDateGreaterThanEqualAndStatusIn(
                dentistId, from, occupyingStatuses());
    }

    @Override
    public long countActiveByPatientFrom(Long patientId, LocalDate from) {
        return appointments.countByPatientIdAndDateGreaterThanEqualAndStatusIn(
                patientId, from, occupyingStatuses());
    }

    @Override
    public String nextCode() {
        return "VD-%04d".formatted(appointments.nextCodeSequence());
    }

    @Override
    public Appointment save(Appointment appointment) {
        AppointmentJpaEntity entity = appointment.id() == null
                ? new AppointmentJpaEntity()
                : appointments.findById(appointment.id()).orElseGet(AppointmentJpaEntity::new);
        mapper.updateEntity(appointment, entity);
        if (appointment.id() == null) {
            // Serializes concurrent bookings of the same dentist so the exclusion constraint
            // reports a conflict instead of a PostgreSQL deadlock between two inserts.
            entityManager.createNativeQuery("select pg_advisory_xact_lock(?)")
                    .setParameter(1, 7_000_000L + appointment.dentistId())
                    .getSingleResult();
        }
        try {
            return mapper.toDomain(appointments.saveAndFlush(entity));
        } catch (DataIntegrityViolationException exception) {
            if (isExclusionViolation(exception)) {
                throw new SlotTakenException(appointment.conflictMessage());
            }
            throw exception;
        }
    }

    private static List<AppointmentStatus> occupyingStatuses() {
        return List.of(
                AppointmentStatus.PENDIENTE,
                AppointmentStatus.CONFIRMADA,
                AppointmentStatus.REPROGRAMADA);
    }

    private static boolean isExclusionViolation(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SQLException sqlException
                    && "23P01".equals(sqlException.getSQLState())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
