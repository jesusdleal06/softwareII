package co.edu.unipamplona.villadent.modules.users.infrastructure.security;

import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.IssuedToken;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.TokenGenerator;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenGeneratorAdapter implements TokenGenerator {

    private static final Duration TOKEN_LIFETIME = Duration.ofHours(8);

    private final JwtEncoder jwtEncoder;
    private final Clock clock;

    public JwtTokenGeneratorAdapter(JwtEncoder jwtEncoder, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.clock = clock;
    }

    @Override
    public IssuedToken issue(User user) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(TOKEN_LIFETIME);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("villadent-agendapro")
                .subject(user.email())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("role", user.role().name())
                .claim("name", user.name())
                .claim("userId", user.id())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt, TOKEN_LIFETIME.toSeconds());
    }
}
