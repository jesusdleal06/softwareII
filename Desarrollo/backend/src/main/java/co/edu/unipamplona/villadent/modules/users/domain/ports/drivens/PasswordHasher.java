package co.edu.unipamplona.villadent.modules.users.domain.ports.drivens;

/** Hides the hashing library from the application layer. */
public interface PasswordHasher {

    String hash(String rawPassword);

    boolean matches(String rawPassword, String passwordHash);
}
