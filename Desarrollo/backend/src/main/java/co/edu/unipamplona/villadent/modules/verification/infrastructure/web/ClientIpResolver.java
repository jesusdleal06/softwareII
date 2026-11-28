package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resolves the client IP used for the per-client rate limit.
 *
 * <p>By default the connection address is used. Behind a reverse proxy the proxy address is the same
 * for every caller, so the application can be configured with the header that carries the real
 * client address (for example {@code X-Forwarded-For}). The left-most, comma-separated value is
 * taken as the client address because proxies append their own hops to the right.
 */
@Component
public class ClientIpResolver {

    private final String headerName;

    public ClientIpResolver(@Value("${app.verification.client-ip-header:}") String headerName) {
        this.headerName = headerName;
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        if (headerName == null || headerName.isBlank()) {
            return remoteAddress;
        }
        String header = request.getHeader(headerName);
        if (header == null || header.isBlank()) {
            return remoteAddress;
        }
        String leftMost = header.split(",")[0].trim();
        return leftMost.isEmpty() ? remoteAddress : leftMost;
    }
}
