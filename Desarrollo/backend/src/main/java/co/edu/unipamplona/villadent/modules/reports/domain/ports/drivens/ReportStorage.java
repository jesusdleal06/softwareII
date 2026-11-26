package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens;

import java.io.OutputStream;

public interface ReportStorage {
    String upload(byte[] pdf);
    void download(String publicId, OutputStream target);
}
