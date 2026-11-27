package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

import java.util.List;

public interface UpdateProcedureDentistsUseCase {

    ProcedureResult updateDentists(Long procedureId, List<Long> dentistIds);
}
