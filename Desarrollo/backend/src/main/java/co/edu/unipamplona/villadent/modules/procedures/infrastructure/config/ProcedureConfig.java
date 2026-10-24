package co.edu.unipamplona.villadent.modules.procedures.infrastructure.config;

import co.edu.unipamplona.villadent.modules.procedures.application.ListProceduresService;
import co.edu.unipamplona.villadent.modules.procedures.application.RegisterProcedureService;
import co.edu.unipamplona.villadent.modules.procedures.application.SetProcedureActiveService;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.SetProcedureActiveUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProcedureConfig {

    @Bean
    public RegisterProcedureUseCase registerProcedureUseCase(ProcedureRepository procedures) {
        return new RegisterProcedureService(procedures);
    }

    @Bean
    public ListProceduresUseCase listProceduresUseCase(ProcedureRepository procedures) {
        return new ListProceduresService(procedures);
    }

    @Bean
    public SetProcedureActiveUseCase setProcedureActiveUseCase(ProcedureRepository procedures) {
        return new SetProcedureActiveService(procedures);
    }
}
