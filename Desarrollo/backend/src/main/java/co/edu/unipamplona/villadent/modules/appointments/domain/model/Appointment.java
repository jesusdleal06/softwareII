package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

public final class Appointment {

    private final Long id;
    private final String code;
    private final Long patientId;
    private final Long dentistId;
    private final Long procedureId;
    private final LocalDate date;
    private final LocalTime time;
    private final int durationMinutes;
    private final AppointmentStatus status;
    private final AppointmentOrigin origin;
    private final String tokenHash;

    public static final String PUBLIC_CONFLICT =
            "Este horario acaba de ser ocupado. Por favor elige otro.";
    public static final String STAFF_CONFLICT =
            "Este horario acaba de ser ocupado, elige otro.";

    public Appointment(
            Long id,
            String code,
            Long patientId,
            Long dentistId,
            Long procedureId,
            LocalDate date,
            LocalTime time,
            int durationMinutes,
            AppointmentStatus status,
            AppointmentOrigin origin,
            String tokenHash) {
        if (patientId == null || dentistId == null || procedureId == null) {
            throw new IllegalArgumentException("An appointment needs a patient, a dentist and a procedure.");
        }
        if (date == null || time == null || durationMinutes <= 0) {
            throw new IllegalArgumentException("An appointment needs a date, a time and a positive duration.");
        }
        this.id = id;
        this.code = code;
        this.patientId = patientId;
        this.dentistId = dentistId;
        this.procedureId = procedureId;
        this.date = date;
        this.time = time;
        this.durationMinutes = durationMinutes;
        this.status = Objects.requireNonNull(status, "status");
        this.origin = Objects.requireNonNull(origin, "origin");
        this.tokenHash = tokenHash;
    }

    public static Appointment book(
            String code,
            Long patientId,
            Long dentistId,
            Long procedureId,
            LocalDate date,
            LocalTime time,
            int durationMinutes,
            AppointmentOrigin origin) {
        return new Appointment(
                null,
                code,
                patientId,
                dentistId,
                procedureId,
                date,
                time,
                durationMinutes,
                AppointmentStatus.PENDIENTE,
                origin,
                null);
    }

    public Appointment cancel() {
        return new Appointment(
                id, code, patientId, dentistId, procedureId, date, time, durationMinutes,
                AppointmentStatus.CANCELADA, origin, tokenHash);
    }

    public LocalTime end() {
        return time.plusMinutes(durationMinutes);
    }

    public boolean occupiesSlot() {
        return status.occupiesSlot();
    }

    public boolean overlaps(LocalDate otherDate, LocalTime otherStart, int otherDurationMinutes) {
        if (!occupiesSlot() || !date.equals(otherDate)) {
            return false;
        }
        LocalTime otherEnd = otherStart.plusMinutes(otherDurationMinutes);
        return time.isBefore(otherEnd) && end().isAfter(otherStart);
    }

    public boolean overlaps(Appointment other) {
        return occupiesSlot()
                && other.occupiesSlot()
                && date.equals(other.date)
                && time.isBefore(other.end())
                && end().isAfter(other.time);
    }

    /** Booking rule shared by the web and the manual flows. */
    public void ensureNoOverlap(List<Appointment> existing) {
        if (existing.stream().anyMatch(this::overlaps)) {
            throw new SlotTakenException(conflictMessage());
        }
    }

    public String conflictMessage() {
        return origin == AppointmentOrigin.MANUAL ? STAFF_CONFLICT : PUBLIC_CONFLICT;
    }

    public Long id() {
        return id;
    }

    public String code() {
        return code;
    }

    public Long patientId() {
        return patientId;
    }

    public Long dentistId() {
        return dentistId;
    }

    public Long procedureId() {
        return procedureId;
    }

    public LocalDate date() {
        return date;
    }

    public LocalTime time() {
        return time;
    }

    public int durationMinutes() {
        return durationMinutes;
    }

    public AppointmentStatus status() {
        return status;
    }

    public AppointmentOrigin origin() {
        return origin;
    }

    public String tokenHash() {
        return tokenHash;
    }
}
