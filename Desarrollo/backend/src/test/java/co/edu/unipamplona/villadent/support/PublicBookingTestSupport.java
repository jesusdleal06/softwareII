package co.edu.unipamplona.villadent.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Drives the public phone verification flow so tests can book like the real frontend: request a
 * code, read the code the fake sender captured and exchange it for a verification token.
 */
public final class PublicBookingTestSupport {

    private static final String CODE_REQUESTS = "/api/v1/public/phone-verifications";
    private static final String VERIFY = "/api/v1/public/phone-verifications/verify";

    private PublicBookingTestSupport() {
    }

    public static String obtainToken(
            MockMvc mockMvc,
            CapturingVerificationSender sender,
            String phone) throws Exception {
        mockMvc.perform(post(CODE_REQUESTS)
                        .with(request -> {
                            request.setRemoteAddr(randomIp());
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"%s\"}".formatted(phone)))
                .andExpect(status().isAccepted());

        String code = sender.latestCode(phone)
                .orElseThrow(() -> new AssertionError("No verification code was sent to " + phone));

        MvcResult result = mockMvc.perform(post(VERIFY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"%s","code":"%s"}
                                """.formatted(phone, code)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.verificationToken");
    }

    /**
     * Random remote address: the per-IP limit counts stored rows, so tests must not share one address.
     */
    public static String randomIp() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return "10.%d.%d.%d".formatted(
                random.nextInt(256), random.nextInt(256), random.nextInt(1, 255));
    }
}
