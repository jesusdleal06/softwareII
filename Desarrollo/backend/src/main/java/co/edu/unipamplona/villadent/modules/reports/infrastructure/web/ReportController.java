package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import co.edu.unipamplona.villadent.modules.reports.domain.error.ReportExportException;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ExportReportPdfUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ReportHistoryUseCase;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private static final MediaType CSV = MediaType.parseMediaType("text/csv;charset=UTF-8");

    private final GenerateReportUseCase generateReportUseCase;
    private final ReportWebMapper mapper;
    private final ExportReportPdfUseCase pdf;
    private final ReportHistoryUseCase history;

    public ReportController(GenerateReportUseCase generateReportUseCase, ReportWebMapper mapper,
                            ExportReportPdfUseCase pdf, ReportHistoryUseCase history) {
        this.generateReportUseCase = generateReportUseCase;
        this.mapper = mapper;
        this.pdf = pdf;
        this.history = history;
    }

    @GetMapping
    public ReportResponse report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long dentistId) {
        return mapper.toResponse(generateReportUseCase.generate(from, to, dentistId));
    }

    @GetMapping("/export")
    public ResponseEntity<?> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long dentistId,
            @RequestParam(required = false) String format,
            @AuthenticationPrincipal Jwt jwt) {
        if ("pdf".equals(format)) {
            long userId = ((Number) jwt.getClaim("userId")).longValue();
            return attachment(MediaType.APPLICATION_PDF, from, to, "pdf")
                    .body(pdf.export(from, to, dentistId, userId));
        }
        if (format != null && !"csv".equals(format)) {
            throw ReportExportException.unknownFormat();
        }
        return attachment(CSV, from, to, "csv")
                .body(ReportCsvWriter.write(generateReportUseCase.generate(from, to, dentistId)));
    }

    @GetMapping("/history")
    public List<ReportHistoryResponse> history() {
        return history.recent().stream().map(mapper::toHistoryResponse).toList();
    }

    @GetMapping("/history/{id}/pdf")
    public ResponseEntity<StreamingResponseBody> historyPdf(@PathVariable long id) {
        var download = history.findDownload(id);
        return attachment(MediaType.APPLICATION_PDF, download.from(), download.to(), "pdf")
                .body(download.content()::writeTo);
    }

    private static ResponseEntity.BodyBuilder attachment(
            MediaType mediaType, LocalDate from, LocalDate to, String extension) {
        String filename = "reporte-%s-%s.%s".formatted(from, to, extension);
        return ResponseEntity.ok().contentType(mediaType)
                .header("Content-Disposition", ContentDisposition.attachment().filename(filename).build().toString());
    }
}
