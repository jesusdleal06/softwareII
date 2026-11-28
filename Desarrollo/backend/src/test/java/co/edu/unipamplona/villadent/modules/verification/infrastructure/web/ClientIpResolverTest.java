package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private final MockHttpServletRequest request = new MockHttpServletRequest();

    ClientIpResolverTest() {
        request.setRemoteAddr("192.168.1.20");
    }

    @Test
    @DisplayName("CP-RF02-08: without a configured header the socket address is the client IP")
    void withoutAConfiguredHeaderUsesTheSocketAddress() {
        request.addHeader("X-Forwarded-For", "1.2.3.4, 10.0.0.1");

        assertThat(new ClientIpResolver("").resolve(request)).isEqualTo("192.168.1.20");
    }

    @Test
    @DisplayName("CP-RF02-08: with a configured header the left-most forwarded address is the client IP")
    void withAConfiguredHeaderUsesTheLeftMostAddress() {
        request.addHeader("X-Forwarded-For", " 1.2.3.4 , 10.0.0.1");

        assertThat(new ClientIpResolver("X-Forwarded-For").resolve(request)).isEqualTo("1.2.3.4");
    }

    @Test
    @DisplayName("CP-RF02-08: a configured header missing from the request falls back to the socket address")
    void aMissingHeaderFallsBackToTheSocketAddress() {
        assertThat(new ClientIpResolver("X-Forwarded-For").resolve(request)).isEqualTo("192.168.1.20");
    }

    @Test
    @DisplayName("CP-RF02-08: a blank header falls back to the socket address")
    void aBlankHeaderFallsBackToTheSocketAddress() {
        request.addHeader("X-Forwarded-For", "   ");

        assertThat(new ClientIpResolver("X-Forwarded-For").resolve(request)).isEqualTo("192.168.1.20");
    }
}
