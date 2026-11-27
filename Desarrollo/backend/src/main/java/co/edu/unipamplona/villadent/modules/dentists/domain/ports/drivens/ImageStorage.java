package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens;

public interface ImageStorage {
    StoredImage upload(byte[] bytes, String contentType);

    record StoredImage(String url, String publicId) {}
}
