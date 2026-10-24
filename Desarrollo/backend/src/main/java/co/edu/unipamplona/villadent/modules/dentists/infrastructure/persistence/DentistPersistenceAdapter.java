package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class DentistPersistenceAdapter implements DentistRepository {

    private final DentistJpaRepository dentists;
    private final DentistPersistenceMapper mapper;

    public DentistPersistenceAdapter(
            DentistJpaRepository dentists,
            DentistPersistenceMapper mapper) {
        this.dentists = dentists;
        this.mapper = mapper;
    }

    @Override
    public Optional<Dentist> findById(Long id) {
        return dentists.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Dentist> findByUserId(Long userId) {
        return dentists.findByUserId(userId).map(mapper::toDomain);
    }

    @Override
    public List<Dentist> findAll() {
        return dentists.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Dentist save(Dentist dentist) {
        DentistJpaEntity entity = dentist.id() == null
                ? new DentistJpaEntity()
                : dentists.findById(dentist.id()).orElseGet(DentistJpaEntity::new);
        mapper.updateEntity(dentist, entity);
        return mapper.toDomain(dentists.save(entity));
    }
}
