package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidDentistDataException;
import java.util.Objects;

public final class Dentist {

    public static final String NAME_REQUIRED = "El nombre del odontólogo es obligatorio.";

    private final Long id;
    private final String name;
    private final String specialty;
    private final Long userId;
    private final boolean active;

    public Dentist(Long id, String name, String specialty, Long userId, boolean active) {
        this.id = id;
        this.name = requireName(name);
        this.specialty = normalizeOptional(specialty);
        this.userId = userId;
        this.active = active;
    }

    public static Dentist create(String name, String specialty, Long userId) {
        return new Dentist(null, name, specialty, userId, true);
    }

    public Dentist changeActive(boolean active) {
        return new Dentist(id, name, specialty, userId, active);
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidDentistDataException(NAME_REQUIRED);
        }
        return name.trim().replaceAll("\\s+", " ");
    }

    private static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String specialty() {
        return specialty;
    }

    public Long userId() {
        return userId;
    }

    public boolean isActive() {
        return active;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Dentist dentist)) {
            return false;
        }
        return Objects.equals(id, dentist.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
