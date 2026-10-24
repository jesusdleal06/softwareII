package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

public record ReportCountsResponse(
        int pending,
        int confirmed,
        int rescheduled,
        int cancelled,
        int attended,
        int noShow) {}
