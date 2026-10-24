package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private static final MediaType CSV = MediaType.parseMediaType("text/csv;charset=UTF-8");

    private final GenerateReportUseCase generateReportUseCase;
    private final ReportWebMapper mapper;

    public ReportController(GenerateReportUseCase generateReportUseCase, ReportWebMapper mapper) {
        this.generateReportUseCase = generateReportUseCase;
        this.mapper = mapper;
    }

    @GetMapping
    public ReportResponse report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long dentistId) {
        return mapper.toResponse(generateReportUseCase.generate(from, to, dentistId));
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long dentistId) {
        Report report = generateReportUseCase.generate(from, to, dentistId);
        String filename = "reporte-%s-%s.csv".formatted(from, to);
        return ResponseEntity.ok()
                .contentType(CSV)
                .header("Content-Disposition",
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(ReportCsvWriter.write(report));
    }
}
