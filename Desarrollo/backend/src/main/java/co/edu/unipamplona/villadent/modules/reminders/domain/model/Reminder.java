package co.edu.unipamplona.villadent.modules.reminders.domain.model;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

public final class Reminder {

    public static final Duration RETRY_DELAY = Duration.ofMinutes(5);

    private final Long id;
    private final Long appointmentId;
    private final LocalDateTime scheduledFor;
    private final LocalDateTime sentAt;
    private final ReminderStatus status;
    private final int attempts;
    private final String lastError;

    public Reminder(
            Long id,
            Long appointmentId,
            LocalDateTime scheduledFor,
            LocalDateTime sentAt,
            ReminderStatus status,
            int attempts,
            String lastError) {
        if (appointmentId == null || scheduledFor == null) {
            throw new IllegalArgumentException("A reminder needs an appointment and a schedule.");
        }
        this.id = id;
        this.appointmentId = appointmentId;
        this.scheduledFor = scheduledFor;
        this.sentAt = sentAt;
        this.status = Objects.requireNonNull(status, "status");
        this.attempts = attempts;
        this.lastError = lastError;
    }

    public static Reminder scheduled(Long appointmentId, LocalDateTime scheduledFor) {
        return new Reminder(null, appointmentId, scheduledFor, null, ReminderStatus.PROGRAMADO, 0, null);
    }

    public Reminder sent(LocalDateTime at) {
        return new Reminder(id, appointmentId, scheduledFor, at, ReminderStatus.ENVIADO, attempts + 1, null);
    }

    public Reminder failed(String error, LocalDateTime now, int maxAttempts) {
        int nextAttempts = attempts + 1;
        return new Reminder(
                id,
                appointmentId,
                now.plus(RETRY_DELAY),
                null,
                nextAttempts >= maxAttempts ? ReminderStatus.FALLIDO : ReminderStatus.PROGRAMADO,
                nextAttempts,
                error);
    }

    public Reminder cancelled() {
        return new Reminder(id, appointmentId, scheduledFor, sentAt, ReminderStatus.CANCELADO, attempts, lastError);
    }

    public boolean isDue(LocalDateTime now) {
        return status == ReminderStatus.PROGRAMADO && !scheduledFor.isAfter(now);
    }

    public Long id() {
        return id;
    }

    public Long appointmentId() {
        return appointmentId;
    }

    public LocalDateTime scheduledFor() {
        return scheduledFor;
    }

    public LocalDateTime sentAt() {
        return sentAt;
    }

    public ReminderStatus status() {
        return status;
    }

    public int attempts() {
        return attempts;
    }

    public String lastError() {
        return lastError;
    }
}
