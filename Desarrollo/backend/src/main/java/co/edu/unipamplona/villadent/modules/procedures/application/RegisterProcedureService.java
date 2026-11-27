package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class RegisterProcedureService implements RegisterProcedureUseCase {

    private final ProcedureRepository procedures;
    private final FindDentistUseCase dentists;
    private final ListDentistsUseCase listDentists;

    public RegisterProcedureService(
            ProcedureRepository procedures,
            FindDentistUseCase dentists,
            ListDentistsUseCase listDentists) {
        this.procedures = procedures;
        this.dentists = dentists;
        this.listDentists = listDentists;
    }

    @Override
    @Transactional
    public ProcedureResult register(RegisterProcedureCommand command) {
        List<Long> requested = command.dentistIds();
        Procedure candidate = Procedure.create(
                command.name(), command.durationMinutes(), requested);
        List<Long> dentistIds = requested == null
                ? activeDentistIds()
                : ProcedureDentistValidator.requireActive(dentists, requested);
        if (procedures.findByNameIgnoreCase(candidate.name()).isPresent()) {
            throw new ConflictException(
                    "PROCEDURE_ALREADY_EXISTS",
                    "Ya existe un procedimiento con ese nombre.");
        }
        return toResult(procedures.save(candidate.changeDentists(dentistIds)));
    }

    private List<Long> activeDentistIds() {
        return listDentists.list().stream()
                .filter(DentistResult::active)
                .map(DentistResult::id)
                .toList();
    }

    static ProcedureResult toResult(Procedure procedure) {
        return new ProcedureResult(
                procedure.id(),
                procedure.name(),
                procedure.durationMinutes(),
                procedure.isActive(),
                procedure.dentistIds());
    }
}
