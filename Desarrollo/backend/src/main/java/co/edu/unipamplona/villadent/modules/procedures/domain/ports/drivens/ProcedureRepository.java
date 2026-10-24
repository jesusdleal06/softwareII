package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import java.util.List;
import java.util.Optional;

public interface ProcedureRepository {

    Optional<Procedure> findById(Long id);

    Optional<Procedure> findByNameIgnoreCase(String name);

    List<Procedure> findAll();

    Procedure save(Procedure procedure);
}
