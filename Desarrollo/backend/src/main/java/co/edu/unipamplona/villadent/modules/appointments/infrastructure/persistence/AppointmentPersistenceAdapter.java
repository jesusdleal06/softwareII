package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class AppointmentPersistenceAdapter implements AppointmentRepository {

    private final AppointmentJpaRepository appointments;
    private final AppointmentPersistenceMapper mapper;

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
    public long countActiveFrom(Long dentistId, LocalDate from) {
        return appointments.countByDentistIdAndDateGreaterThanEqualAndStatusIn(
                dentistId,
                from,
                List.of(
                        AppointmentStatus.PENDIENTE,
                        AppointmentStatus.CONFIRMADA,
                        AppointmentStatus.REPROGRAMADA));
    }

    @Override
    public Appointment save(Appointment appointment) {
        AppointmentJpaEntity entity = appointment.id() == null
                ? new AppointmentJpaEntity()
                : appointments.findById(appointment.id()).orElseGet(AppointmentJpaEntity::new);
        mapper.updateEntity(appointment, entity);
        return mapper.toDomain(appointments.save(entity));
    }
}
