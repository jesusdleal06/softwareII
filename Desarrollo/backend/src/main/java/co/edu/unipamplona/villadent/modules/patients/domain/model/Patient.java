package co.edu.unipamplona.villadent.modules.patients.domain.model;

import co.edu.unipamplona.villadent.modules.patients.domain.error.InvalidPatientDataException;

/** A patient is not a user and never signs in: it is identified by a unique phone. */
public final class Patient {

    public static final String NAME_REQUIRED = "El nombre completo es obligatorio.";
    public static final String FULL_NAME_REQUIRED = "Escribe nombre y apellido.";
    public static final String PHONE_REQUIRED = "El número de celular es obligatorio.";
    public static final String PHONE_LENGTH = "El celular debe tener 10 dígitos.";
    public static final String PHONE_PREFIX = "Escribe un celular colombiano válido (empieza por 3).";

    private final Long id;
    private final String fullName;
    private final String phone;
    private final boolean active;

    public Patient(Long id, String fullName, String phone, boolean active) {
        this.id = id;
        this.fullName = normalizeFullName(fullName);
        this.phone = normalizePhone(phone);
        this.active = active;
    }

    public static Patient create(String fullName, String phone) {
        return new Patient(null, fullName, phone, true);
    }

    public Patient changeActive(boolean active) {
        return new Patient(id, fullName, phone, active);
    }

    public Patient reactivate(String newFullName) {
        return new Patient(id, newFullName, phone, true);
    }

    public static String normalizeFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new InvalidPatientDataException(NAME_REQUIRED);
        }
        String normalized = fullName.trim().replaceAll("\\s+", " ");
        if (normalized.split(" ").length < 2) {
            throw new InvalidPatientDataException(FULL_NAME_REQUIRED);
        }
        return normalized;
    }

    public static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new InvalidPatientDataException(PHONE_REQUIRED);
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() != 10) {
            throw new InvalidPatientDataException(PHONE_LENGTH);
        }
        if (!digits.startsWith("3")) {
            throw new InvalidPatientDataException(PHONE_PREFIX);
        }
        return digits;
    }

    public Long id() {
        return id;
    }

    public String fullName() {
        return fullName;
    }

    public String phone() {
        return phone;
    }

    public boolean isActive() {
        return active;
    }
}
