package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import java.time.LocalDate;

public record DailyReportResponse(LocalDate date, int total, ReportCountsResponse counts) {}
