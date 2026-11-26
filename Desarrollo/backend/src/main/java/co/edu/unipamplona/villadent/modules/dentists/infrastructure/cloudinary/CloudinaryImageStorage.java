package co.edu.unipamplona.villadent.modules.dentists.infrastructure.cloudinary;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ImageStorage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CloudinaryImageStorage implements ImageStorage {
    private static final String FOLDER = "villadent/dentists";

    private final RestClient client;
    private final Clock clock;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public CloudinaryImageStorage(Clock clock,
                                 @Value("${app.cloudinary.cloud-name}") String cloudName,
                                 @Value("${app.cloudinary.api-key}") String apiKey,
                                 @Value("${app.cloudinary.api-secret}") String apiSecret) {
        this.clock = clock;
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder().baseUrl("https://api.cloudinary.com").requestFactory(factory).build();
    }

    @Override
    public StoredImage upload(byte[] bytes, String contentType) {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new IllegalStateException("Cloudinary credentials are not configured");
        }

        long timestamp = clock.instant().getEpochSecond();
        var form = new MultipartBodyBuilder();
        form.part("file", bytes).filename("profile-photo").contentType(MediaType.parseMediaType(contentType));
        form.part("folder", FOLDER);
        form.part("timestamp", Long.toString(timestamp));
        form.part("api_key", apiKey);
        form.part("signature", sign(timestamp));
        Map<?, ?> body = client.post().uri("/v1_1/{cloud}/image/upload", cloudName)
                .contentType(MediaType.MULTIPART_FORM_DATA).body(form.build())
                .retrieve().body(Map.class);
        if (body == null || !(body.get("secure_url") instanceof String url) || url.isBlank()
                || !(body.get("public_id") instanceof String publicId) || publicId.isBlank()) {
            throw new IllegalStateException("Cloudinary did not return an image URL and public ID");
        }
        return new StoredImage(url, publicId);
    }

    private String sign(long timestamp) {
        String parameters = "folder=" + FOLDER + "&timestamp=" + timestamp + apiSecret;
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-1").digest(parameters.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-1 is not available", exception);
        }
    }
}
