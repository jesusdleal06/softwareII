package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.UpdateProcedureDentistsUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class UpdateProcedureDentistsService implements UpdateProcedureDentistsUseCase {

    private final ProcedureRepository procedures;
    private final FindDentistUseCase dentists;

    public UpdateProcedureDentistsService(ProcedureRepository procedures, FindDentistUseCase dentists) {
        this.procedures = procedures;
        this.dentists = dentists;
    }

    @Override
    @Transactional
    public ProcedureResult updateDentists(Long procedureId, List<Long> dentistIds) {
        Procedure procedure = procedures.findById(procedureId)
                .orElseThrow(() -> new NotFoundException("No se encontró el procedimiento."));
        List<Long> validated = ProcedureDentistValidator.requireActive(dentists, dentistIds);
        return RegisterProcedureService.toResult(
                procedures.save(procedure.changeDentists(validated)));
    }
}
