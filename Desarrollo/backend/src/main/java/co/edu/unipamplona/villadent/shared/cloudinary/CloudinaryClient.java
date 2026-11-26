package co.edu.unipamplona.villadent.shared.cloudinary;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

@Component
public class CloudinaryClient {
    public record UploadedAsset(String publicId, String secureUrl) {}

    private final RestClient client;
    private final Clock clock;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    @Autowired
    public CloudinaryClient(Clock clock,
                            @Value("${app.cloudinary.cloud-name}") String cloudName,
                            @Value("${app.cloudinary.api-key}") String apiKey,
                            @Value("${app.cloudinary.api-secret}") String apiSecret) {
        this(clock, cloudName, apiKey, apiSecret, "https://api.cloudinary.com");
    }

    public CloudinaryClient(Clock clock, String cloudName, String apiKey, String apiSecret, String baseUrl) {
        this.clock = clock;
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public UploadedAsset upload(
            String resourceType, String deliveryType, String folder,
            String fileName, String contentType, byte[] bytes) {
        requireCredentials();
        var params = new TreeMap<String, String>();
        params.put("folder", folder);
        params.put("timestamp", timestamp());
        if (deliveryType != null) {
            params.put("type", deliveryType);
        }

        var file = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };
        var fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        var form = new LinkedMultiValueMap<String, Object>();
        form.add("file", new HttpEntity<>(file, fileHeaders));
        params.forEach(form::add);
        form.add("api_key", apiKey);
        form.add("signature", sign(params));

        Map<?, ?> body = client.post().uri("/v1_1/{cloud}/{resource}/upload", cloudName, resourceType)
                .contentType(MediaType.MULTIPART_FORM_DATA).body(form)
                .retrieve().body(Map.class);
        if (body == null || !(body.get("public_id") instanceof String publicId) || publicId.isBlank()) {
            throw new IllegalStateException("Cloudinary did not return a public ID");
        }
        return new UploadedAsset(publicId, body.get("secure_url") instanceof String url ? url : null);
    }

    public void downloadAuthenticatedRaw(String publicId, OutputStream target) {
        requireCredentials();
        var params = Map.of("public_id", publicId, "timestamp", timestamp(), "type", "authenticated");
        client.get().uri("/v1_1/{cloud}/raw/download"
                        + "?public_id={id}&timestamp={timestamp}&type={type}&api_key={key}&signature={signature}",
                cloudName, publicId, params.get("timestamp"), params.get("type"), apiKey, sign(params))
                .exchange((request, response) -> {
                    if (!response.getStatusCode().is2xxSuccessful()) {
                        throw new ResourceAccessException("Cloudinary private download failed");
                    }
                    response.getBody().transferTo(target);
                    return null;
                });
    }

    private void requireCredentials() {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new IllegalStateException("Cloudinary credentials are not configured");
        }
    }

    private String timestamp() {
        return Long.toString(clock.instant().getEpochSecond());
    }

    private String sign(Map<String, String> params) {
        String parameters = new TreeMap<>(params).entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest((parameters + apiSecret).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-1 is not available", exception);
        }
    }
}
