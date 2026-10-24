package co.edu.unipamplona.villadent.modules.reminders.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "recordatorios")
public class ReminderJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_recordatorio")
    private Long id;

    @Column(name = "id_cita", nullable = false)
    private Long appointmentId;

    @Column(name = "canal", nullable = false)
    private String channel;

    @Column(name = "programado_para", nullable = false)
    private Instant scheduledFor;

    @Column(name = "fecha_envio")
    private Instant sentAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_envio", nullable = false)
    private ReminderStatus status;

    @Column(name = "intentos", nullable = false)
    private int attempts;

    @Column(name = "ultimo_error")
    private String lastError;

    @CreationTimestamp
    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "actualizado_en", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public String getChannel() {
        return channel;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public ReminderStatus getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getLastError() {
        return lastError;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setAppointmentId(Long appointmentId) {
        this.appointmentId = appointmentId;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public void setScheduledFor(Instant scheduledFor) {
        this.scheduledFor = scheduledFor;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public void setStatus(ReminderStatus status) {
        this.status = status;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }
}
