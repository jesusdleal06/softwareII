package co.edu.unipamplona.villadent.modules.dentists.infrastructure.cloudinary;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ImageStorage;
import co.edu.unipamplona.villadent.shared.cloudinary.CloudinaryClient;
import org.springframework.stereotype.Component;

@Component
public class CloudinaryImageStorage implements ImageStorage {
    private final CloudinaryClient client;

    public CloudinaryImageStorage(CloudinaryClient client) {
        this.client = client;
    }

    @Override
    public StoredImage upload(byte[] bytes, String contentType) {
        var asset = client.upload("image", null, "villadent/dentists", "profile-photo", contentType, bytes);
        if (asset.secureUrl() == null || asset.secureUrl().isBlank()) {
            throw new IllegalStateException("Cloudinary did not return an image URL");
        }
        return new StoredImage(asset.secureUrl(), asset.publicId());
    }
}
