package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

import java.util.Optional;

public interface FindProcedureUseCase {

    Optional<ProcedureResult> findById(Long id);
}
