package co.edu.unipamplona.villadent.modules.procedures.infrastructure.config;

import co.edu.unipamplona.villadent.modules.procedures.application.FindProcedureService;
import co.edu.unipamplona.villadent.modules.procedures.application.ListActiveProceduresService;
import co.edu.unipamplona.villadent.modules.procedures.application.ListProceduresService;
import co.edu.unipamplona.villadent.modules.procedures.application.RegisterProcedureService;
import co.edu.unipamplona.villadent.modules.procedures.application.SetProcedureActiveService;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListActiveProceduresUseCase;
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
    public ListActiveProceduresUseCase listActiveProceduresUseCase(ProcedureRepository procedures) {
        return new ListActiveProceduresService(procedures);
    }

    @Bean
    public FindProcedureUseCase findProcedureUseCase(ProcedureRepository procedures) {
        return new FindProcedureService(procedures);
    }

    @Bean
    public SetProcedureActiveUseCase setProcedureActiveUseCase(ProcedureRepository procedures) {
        return new SetProcedureActiveService(procedures);
    }
}
