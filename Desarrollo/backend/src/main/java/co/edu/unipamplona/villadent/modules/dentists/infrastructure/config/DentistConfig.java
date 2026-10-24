package co.edu.unipamplona.villadent.modules.dentists.infrastructure.config;

import co.edu.unipamplona.villadent.modules.dentists.application.AddScheduleService;
import co.edu.unipamplona.villadent.modules.dentists.application.ListDentistsService;
import co.edu.unipamplona.villadent.modules.dentists.application.ListSchedulesService;
import co.edu.unipamplona.villadent.modules.dentists.application.RegisterDentistService;
import co.edu.unipamplona.villadent.modules.dentists.application.SetDentistActiveService;
import co.edu.unipamplona.villadent.modules.dentists.application.SetScheduleActiveService;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetScheduleActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DentistConfig {

    @Bean
    public RegisterDentistUseCase registerDentistUseCase(DentistRepository dentists) {
        return new RegisterDentistService(dentists);
    }

    @Bean
    public ListDentistsUseCase listDentistsUseCase(DentistRepository dentists) {
        return new ListDentistsService(dentists);
    }

    @Bean
    public SetDentistActiveUseCase setDentistActiveUseCase(DentistRepository dentists) {
        return new SetDentistActiveService(dentists);
    }

    @Bean
    public AddScheduleUseCase addScheduleUseCase(
            DentistRepository dentists,
            ScheduleRepository schedules) {
        return new AddScheduleService(dentists, schedules);
    }

    @Bean
    public ListSchedulesUseCase listSchedulesUseCase(
            DentistRepository dentists,
            ScheduleRepository schedules) {
        return new ListSchedulesService(dentists, schedules);
    }

    @Bean
    public SetScheduleActiveUseCase setScheduleActiveUseCase(ScheduleRepository schedules) {
        return new SetScheduleActiveService(schedules);
    }
}
