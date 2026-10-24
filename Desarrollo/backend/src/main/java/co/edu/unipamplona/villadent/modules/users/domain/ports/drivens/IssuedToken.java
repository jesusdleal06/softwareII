package co.edu.unipamplona.villadent.modules.users.domain.ports.drivens;

import java.time.Instant;

public record IssuedToken(String token, Instant expiresAt, long expiresInSeconds) {
}
