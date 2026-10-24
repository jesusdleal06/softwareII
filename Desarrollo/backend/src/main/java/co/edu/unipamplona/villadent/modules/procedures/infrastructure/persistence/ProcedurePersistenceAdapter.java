package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ProcedurePersistenceAdapter implements ProcedureRepository {

    private final ProcedureJpaRepository procedures;
    private final ProcedurePersistenceMapper mapper;

    public ProcedurePersistenceAdapter(
            ProcedureJpaRepository procedures,
            ProcedurePersistenceMapper mapper) {
        this.procedures = procedures;
        this.mapper = mapper;
    }

    @Override
    public Optional<Procedure> findById(Long id) {
        return procedures.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Procedure> findByNameIgnoreCase(String name) {
        return procedures.findByNameIgnoreCase(name).map(mapper::toDomain);
    }

    @Override
    public List<Procedure> findAll() {
        return procedures.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Procedure save(Procedure procedure) {
        ProcedureJpaEntity entity = procedure.id() == null
                ? new ProcedureJpaEntity()
                : procedures.findById(procedure.id()).orElseGet(ProcedureJpaEntity::new);
        mapper.updateEntity(procedure, entity);
        return mapper.toDomain(procedures.save(entity));
    }
}
