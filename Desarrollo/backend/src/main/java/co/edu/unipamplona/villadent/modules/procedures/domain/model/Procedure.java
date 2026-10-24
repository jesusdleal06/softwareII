package co.edu.unipamplona.villadent.modules.procedures.domain.model;

import co.edu.unipamplona.villadent.modules.procedures.domain.error.InvalidProcedureDataException;
import java.util.Set;

public final class Procedure {

    private static final Set<Integer> ALLOWED_DURATIONS = Set.of(30, 45, 60, 90);

    private final Long id;
    private final String name;
    private final int durationMinutes;
    private final boolean active;

    public Procedure(Long id, String name, int durationMinutes, boolean active) {
        if (name == null || name.isBlank()) {
            throw new InvalidProcedureDataException("El nombre del procedimiento es obligatorio.");
        }
        if (!ALLOWED_DURATIONS.contains(durationMinutes)) {
            throw new InvalidProcedureDataException(
                    "La duración del procedimiento debe ser 30, 45, 60 o 90 minutos.");
        }
        this.id = id;
        this.name = name.trim().replaceAll("\\s+", " ");
        this.durationMinutes = durationMinutes;
        this.active = active;
    }

    public static Procedure create(String name, int durationMinutes) {
        return new Procedure(null, name, durationMinutes, true);
    }

    public Procedure changeActive(boolean active) {
        return new Procedure(id, name, durationMinutes, active);
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public int durationMinutes() {
        return durationMinutes;
    }

    public boolean isActive() {
        return active;
    }
}
