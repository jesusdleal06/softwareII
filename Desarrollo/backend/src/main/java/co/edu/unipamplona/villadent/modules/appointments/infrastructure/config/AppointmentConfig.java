package co.edu.unipamplona.villadent.modules.appointments.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.application.GetAvailabilityService;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
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
}
