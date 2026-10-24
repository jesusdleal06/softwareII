package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "citas")
public class AppointmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cita")
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true)
    private String code;

    @Column(name = "id_paciente", nullable = false)
    private Long patientId;

    @Column(name = "id_odontologo", nullable = false)
    private Long dentistId;

    @Column(name = "id_procedimiento", nullable = false)
    private Long procedureId;

    @Column(name = "fecha", nullable = false)
    private LocalDate date;

    @Column(name = "hora", nullable = false)
    private LocalTime time;

    @Column(name = "duracion_min", nullable = false)
    private int durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private AppointmentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "origen", nullable = false)
    private AppointmentOrigin origin;

    @Column(name = "token_gestion_hash", unique = true)
    private String tokenHash;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @CreationTimestamp
    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "actualizado_en", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public Long getPatientId() {
        return patientId;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public Long getProcedureId() {
        return procedureId;
    }

    public LocalDate getDate() {
        return date;
    }

    public LocalTime getTime() {
        return time;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public AppointmentOrigin getOrigin() {
        return origin;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public int getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public void setDentistId(Long dentistId) {
        this.dentistId = dentistId;
    }

    public void setProcedureId(Long procedureId) {
        this.procedureId = procedureId;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public void setTime(LocalTime time) {
        this.time = time;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public void setOrigin(AppointmentOrigin origin) {
        this.origin = origin;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }
}
