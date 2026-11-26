package co.edu.unipamplona.villadent.modules.reports.infrastructure.cloudinary;

import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportStorage;
import co.edu.unipamplona.villadent.shared.cloudinary.CloudinaryClient;
import java.io.OutputStream;
import org.springframework.stereotype.Component;

@Component
public class CloudinaryReportStorage implements ReportStorage {
    private final CloudinaryClient client;

    public CloudinaryReportStorage(CloudinaryClient client) {
        this.client = client;
    }

    @Override
    public String upload(byte[] pdf) {
        return client.upload("raw", "authenticated", "villadent/reports",
                "report.pdf", "application/pdf", pdf).publicId();
    }

    @Override
    public void download(String publicId, OutputStream target) {
        client.downloadAuthenticatedRaw(publicId, target);
    }
}
