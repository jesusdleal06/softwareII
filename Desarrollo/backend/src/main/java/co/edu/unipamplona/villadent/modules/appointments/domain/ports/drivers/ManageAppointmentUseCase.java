package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.time.LocalTime;

public interface ManageAppointmentUseCase {

    ManagedAppointmentResult view(String token);

    ManagedAppointmentResult confirm(String token);

    ManagedAppointmentResult cancel(String token);

    ManagedAppointmentResult reschedule(String token, LocalDate date, LocalTime time);
}
