package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import java.time.LocalDate;
import java.util.List;

public record ReportResponse(
        LocalDate from,
        LocalDate to,
        Long dentistId,
        int total,
        int attended,
        int cancelled,
        int noShow,
        int noShowRate,
        List<DailyReportResponse> daily) {}
