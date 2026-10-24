package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.FutureAppointmentQuery;
import java.time.LocalDate;
import org.springframework.stereotype.Repository;

@Repository
public class FutureAppointmentAdapter implements FutureAppointmentQuery {

    private final AppointmentRepository appointments;

    public FutureAppointmentAdapter(AppointmentRepository appointments) {
        this.appointments = appointments;
    }

    @Override
    public long countActiveFrom(Long dentistId, LocalDate from) {
        return appointments.countActiveFrom(dentistId, from);
    }
}
