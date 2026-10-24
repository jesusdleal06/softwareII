package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListActiveProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListActiveProceduresService implements ListActiveProceduresUseCase {

    private final ProcedureRepository procedures;

    public ListActiveProceduresService(ProcedureRepository procedures) {
        this.procedures = procedures;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProcedureResult> listActive() {
        return procedures.findAll().stream()
                .filter(procedure -> procedure.isActive())
                .map(RegisterProcedureService::toResult)
                .toList();
    }
}
