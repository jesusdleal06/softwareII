package co.edu.unipamplona.villadent.modules.appointments.domain.model;

/** Cancelled, attended and no-show appointments free their slot. */
public enum AppointmentStatus {
    PENDIENTE,
    CONFIRMADA,
    REPROGRAMADA,
    CANCELADA,
    ATENDIDA,
    NO_ASISTIO;

    public boolean occupiesSlot() {
        return this == PENDIENTE || this == CONFIRMADA || this == REPROGRAMADA;
    }
}
