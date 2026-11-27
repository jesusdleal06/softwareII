package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "procedimiento_odontologos")
@IdClass(ProcedureDentistId.class)
public class ProcedureDentistJpaEntity {

    @Id
    @Column(name = "id_procedimiento", nullable = false)
    private Long procedureId;

    @Id
    @Column(name = "id_odontologo", nullable = false)
    private Long dentistId;

    @CreationTimestamp
    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProcedureDentistJpaEntity() {
    }

    public ProcedureDentistJpaEntity(Long procedureId, Long dentistId) {
        this.procedureId = procedureId;
        this.dentistId = dentistId;
    }

    public Long getProcedureId() {
        return procedureId;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
