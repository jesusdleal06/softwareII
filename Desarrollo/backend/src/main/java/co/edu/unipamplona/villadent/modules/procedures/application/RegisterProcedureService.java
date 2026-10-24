package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import org.springframework.transaction.annotation.Transactional;

public class RegisterProcedureService implements RegisterProcedureUseCase {

    private final ProcedureRepository procedures;

    public RegisterProcedureService(ProcedureRepository procedures) {
        this.procedures = procedures;
    }

    @Override
    @Transactional
    public ProcedureResult register(RegisterProcedureCommand command) {
        Procedure candidate = Procedure.create(command.name(), command.durationMinutes());
        if (procedures.findByNameIgnoreCase(candidate.name()).isPresent()) {
            throw new ConflictException(
                    "PROCEDURE_ALREADY_EXISTS",
                    "Ya existe un procedimiento con ese nombre.");
        }
        return toResult(procedures.save(candidate));
    }

    static ProcedureResult toResult(Procedure procedure) {
        return new ProcedureResult(
                procedure.id(),
                procedure.name(),
                procedure.durationMinutes(),
                procedure.isActive());
    }
}
