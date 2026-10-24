package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class FindProcedureService implements FindProcedureUseCase {

    private final ProcedureRepository procedures;

    public FindProcedureService(ProcedureRepository procedures) {
        this.procedures = procedures;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProcedureResult> findById(Long id) {
        return procedures.findById(id).map(RegisterProcedureService::toResult);
    }
}
