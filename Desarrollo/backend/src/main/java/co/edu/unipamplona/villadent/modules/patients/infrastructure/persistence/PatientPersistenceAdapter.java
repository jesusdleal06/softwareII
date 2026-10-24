package co.edu.unipamplona.villadent.modules.patients.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class PatientPersistenceAdapter implements PatientRepository {

    private final PatientJpaRepository patients;
    private final PatientPersistenceMapper mapper;

    public PatientPersistenceAdapter(
            PatientJpaRepository patients,
            PatientPersistenceMapper mapper) {
        this.patients = patients;
        this.mapper = mapper;
    }

    @Override
    public Optional<Patient> findById(Long id) {
        return patients.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Patient> findByPhone(String phone) {
        return patients.findByPhone(phone).map(mapper::toDomain);
    }

    @Override
    public List<Patient> findAll() {
        return patients.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Patient save(Patient patient) {
        PatientJpaEntity entity = patient.id() == null
                ? new PatientJpaEntity()
                : patients.findById(patient.id()).orElseGet(PatientJpaEntity::new);
        mapper.updateEntity(patient, entity);
        return mapper.toDomain(patients.save(entity));
    }
}
