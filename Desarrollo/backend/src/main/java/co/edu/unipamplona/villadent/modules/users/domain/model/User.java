package co.edu.unipamplona.villadent.modules.users.domain.model;

import co.edu.unipamplona.villadent.modules.users.domain.error.InvalidUserDataException;
import java.util.Locale;
import java.util.Objects;

/** Staff account. Never stores a raw password: only its BCrypt hash. */
public final class User {

    private final Long id;
    private final String name;
    private final String email;
    private final String passwordHash;
    private final Role role;
    private final boolean active;

    public User(Long id, String name, String email, String passwordHash, Role role, boolean active) {
        this.id = id;
        this.name = requireName(name);
        this.email = normalizeEmail(email);
        this.passwordHash = requirePasswordHash(passwordHash);
        this.role = Objects.requireNonNull(role, "role is required");
        this.active = active;
    }

    public static User create(String name, String email, String passwordHash, Role role) {
        return new User(null, name, email, passwordHash, role, true);
    }

    public User changeActive(boolean active) {
        return new User(id, name, email, passwordHash, role, active);
    }

    public static String normalizeEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) {
            throw new InvalidUserDataException("El correo del usuario no es válido.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidUserDataException("El nombre del usuario es obligatorio.");
        }
        return name.trim();
    }

    private static String requirePasswordHash(String passwordHash) {
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new InvalidUserDataException("La contraseña del usuario es obligatoria.");
        }
        return passwordHash;
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String email() {
        return email;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public Role role() {
        return role;
    }

    public boolean isActive() {
        return active;
    }
}
