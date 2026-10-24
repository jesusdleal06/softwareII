package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

import java.util.List;

public interface ListActiveProceduresUseCase {

    List<ProcedureResult> listActive();
}
