package co.edu.unipamplona.villadent.modules.procedures.infrastructure.config;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.procedures.application.FindProcedureService;
import co.edu.unipamplona.villadent.modules.procedures.application.ListActiveProceduresService;
import co.edu.unipamplona.villadent.modules.procedures.application.ListProceduresService;
import co.edu.unipamplona.villadent.modules.procedures.application.RegisterProcedureService;
import co.edu.unipamplona.villadent.modules.procedures.application.SetProcedureActiveService;
import co.edu.unipamplona.villadent.modules.procedures.application.UpdateProcedureDentistsService;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListActiveProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.SetProcedureActiveUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.UpdateProcedureDentistsUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProcedureConfig {

    @Bean
    public RegisterProcedureUseCase registerProcedureUseCase(
            ProcedureRepository procedures,
            FindDentistUseCase dentists,
            ListDentistsUseCase listDentists) {
        return new RegisterProcedureService(procedures, dentists, listDentists);
    }

    @Bean
    public UpdateProcedureDentistsUseCase updateProcedureDentistsUseCase(
            ProcedureRepository procedures,
            FindDentistUseCase dentists) {
        return new UpdateProcedureDentistsService(procedures, dentists);
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
