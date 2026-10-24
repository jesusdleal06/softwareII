package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.SetProcedureActiveUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class SetProcedureActiveService implements SetProcedureActiveUseCase {

    private final ProcedureRepository procedures;

    public SetProcedureActiveService(ProcedureRepository procedures) {
        this.procedures = procedures;
    }

    @Override
    @Transactional
    public ProcedureResult setActive(Long id, boolean active) {
        Procedure procedure = procedures.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el procedimiento."));
        return RegisterProcedureService.toResult(procedures.save(procedure.changeActive(active)));
    }
}
