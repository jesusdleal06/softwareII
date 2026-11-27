package co.edu.unipamplona.villadent.modules.reports.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class ReportExportException extends DomainException {
    private ReportExportException(String code, String message, int status) {
        super(code, message, status);
    }

    public static ReportExportException unknownFormat() {
        return new ReportExportException("INVALID_REPORT_FORMAT", "El formato debe ser csv o pdf.", 400);
    }

    public static ReportExportException dentistNotFound() {
        return new ReportExportException("DENTIST_NOT_FOUND", "No se encontró el odontólogo.", 404);
    }

    public static ReportExportException reportNotFound() {
        return new ReportExportException("REPORT_NOT_FOUND", "No se encontró el reporte.", 404);
    }

    public static ReportExportException downloadFailed() {
        return new ReportExportException("REPORT_DOWNLOAD_FAILED", "No se pudo descargar el reporte.", 502);
    }
}
