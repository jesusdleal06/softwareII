package co.edu.unipamplona.villadent.modules.appointments.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.application.BookAppointmentService;
import co.edu.unipamplona.villadent.modules.appointments.application.GetAgendaService;
import co.edu.unipamplona.villadent.modules.appointments.application.GetAvailabilityService;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAgendaUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppointmentConfig {

    @Bean
    public GetAvailabilityUseCase getAvailabilityUseCase(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            AppointmentRepository appointments,
            Clock clock) {
        return new GetAvailabilityService(dentists, schedules, procedures, appointments, clock);
    }

    @Bean
    public BookAppointmentUseCase bookAppointmentUseCase(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            ResolvePatientUseCase patients,
            AppointmentRepository appointments,
            Clock clock) {
        return new BookAppointmentService(dentists, schedules, procedures, patients, appointments, clock);
    }

    @Bean
    public GetAgendaUseCase getAgendaUseCase(
            AppointmentRepository appointments,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            FindPatientUseCase patients) {
        return new GetAgendaService(appointments, dentists, procedures, patients);
    }
}
