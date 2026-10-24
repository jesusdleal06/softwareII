package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListProceduresService implements ListProceduresUseCase {

    private final ProcedureRepository procedures;

    public ListProceduresService(ProcedureRepository procedures) {
        this.procedures = procedures;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProcedureResult> list() {
        return procedures.findAll().stream().map(RegisterProcedureService::toResult).toList();
    }
}
