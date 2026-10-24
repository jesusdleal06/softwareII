package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

public record LoginResponse(
        String token,
        String tokenType,
        long expiresInSeconds,
        UserResponse user) {
}
