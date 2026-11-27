package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProcedurePersistenceAdapter implements ProcedureRepository {

    private final ProcedureJpaRepository procedures;
    private final ProcedureDentistJpaRepository links;
    private final ProcedurePersistenceMapper mapper;

    public ProcedurePersistenceAdapter(
            ProcedureJpaRepository procedures,
            ProcedureDentistJpaRepository links,
            ProcedurePersistenceMapper mapper) {
        this.procedures = procedures;
        this.links = links;
        this.mapper = mapper;
    }

    @Override
    public Optional<Procedure> findById(Long id) {
        return procedures.findById(id)
                .map(entity -> mapper.toDomain(entity, links.findDentistIdsByProcedureId(id)));
    }

    @Override
    public Optional<Procedure> findByNameIgnoreCase(String name) {
        return procedures.findByNameIgnoreCase(name)
                .map(entity -> mapper.toDomain(
                        entity, links.findDentistIdsByProcedureId(entity.getId())));
    }

    @Override
    public List<Procedure> findAll() {
        Map<Long, List<Long>> dentistIdsByProcedure = links.findAll().stream()
                .collect(Collectors.groupingBy(
                        ProcedureDentistJpaEntity::getProcedureId,
                        Collectors.mapping(ProcedureDentistJpaEntity::getDentistId, Collectors.toList())));
        return procedures.findAll().stream()
                .map(entity -> mapper.toDomain(
                        entity, dentistIdsByProcedure.getOrDefault(entity.getId(), List.of())))
                .toList();
    }

    @Override
    public List<Long> findDentistIds(Long procedureId) {
        return links.findDentistIdsByProcedureId(procedureId);
    }

    @Override
    @Transactional
    public Procedure save(Procedure procedure) {
        ProcedureJpaEntity entity = procedure.id() == null
                ? new ProcedureJpaEntity()
                : procedures.findById(procedure.id()).orElseGet(ProcedureJpaEntity::new);
        mapper.updateEntity(procedure, entity);
        ProcedureJpaEntity saved = procedures.save(entity);
        syncDentists(saved.getId(), procedure.dentistIds());
        return mapper.toDomain(saved, links.findDentistIdsByProcedureId(saved.getId()));
    }

    private void syncDentists(Long procedureId, List<Long> dentistIds) {
        links.removeByProcedureId(procedureId);
        if (!dentistIds.isEmpty()) {
            links.saveAll(dentistIds.stream()
                    .map(dentistId -> new ProcedureDentistJpaEntity(procedureId, dentistId))
                    .toList());
            links.flush();
        }
    }
}
