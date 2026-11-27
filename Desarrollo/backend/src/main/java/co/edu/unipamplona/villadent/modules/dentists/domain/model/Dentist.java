package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidDentistDataException;
import java.util.List;
import java.util.Objects;

public final class Dentist {

    public static final String NAME_REQUIRED = "El nombre del odontólogo es obligatorio.";

    private final Long id;
    private final DentistProfile profile;
    private final String specialty;
    private final Long userId;
    private final boolean active;

    public Dentist(Long id, String name, String specialty, Long userId, boolean active, DentistProfile profile) {
        this.id = id;
        // Accept legacy rows written by callers that still supply only nombre.
        this.profile = profile == null || profile.firstName() == null
                ? DentistProfile.fromLegacyName(requireName(name)) : profile;
        this.specialty = normalizeOptional(specialty);
        this.userId = userId;
        this.active = active;
    }

    public static Dentist create(String name, String specialty, Long userId) {
        return new Dentist(null, name, specialty, userId, true, null);
    }

    public Dentist changeActive(boolean active) {
        return new Dentist(id, null, specialty, userId, active, profile);
    }

    public Dentist updateProfile(String firstName, String secondName, String firstSurname, String secondSurname,
                                 List<String> titles, String description) {
        firstName = require(firstName, "El primer nombre es obligatorio.");
        firstSurname = require(firstSurname, "El primer apellido es obligatorio.");
        List<String> cleanTitles = titles == null ? List.of() : titles.stream()
                .map(Dentist::normalizeOptional).filter(Objects::nonNull).toList();
        if (cleanTitles.isEmpty()) {
            throw new InvalidDentistDataException("Agrega al menos un título académico.");
        }
        if (description != null && description.codePointCount(0, description.length()) > 500) {
            throw new InvalidDentistDataException("La descripción no puede superar 500 caracteres.");
        }
        if (description == null || description.isBlank()) {
            throw new InvalidDentistDataException("La descripción es obligatoria.");
        }
        return withProfile(new DentistProfile(firstName, normalizeOptional(secondName), firstSurname,
                normalizeOptional(secondSurname), profile.photoUrl(), profile.photoPublicId(), cleanTitles,
                description.strip()));
    }

    public Dentist replacePhoto(String url, String publicId) {
        return withProfile(new DentistProfile(profile.firstName(), profile.secondName(), profile.firstSurname(),
                profile.secondSurname(), url, publicId, profile.academicTitles(), profile.description()));
    }

    private Dentist withProfile(DentistProfile updated) {
        return new Dentist(id, null, specialty, userId, active, updated);
    }

    private static String require(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new InvalidDentistDataException(message);
        }
        return normalized;
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidDentistDataException(NAME_REQUIRED);
        }
        return name;
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
        return profile.fullName();
    }

    public DentistProfile profile() {
        return profile;
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
