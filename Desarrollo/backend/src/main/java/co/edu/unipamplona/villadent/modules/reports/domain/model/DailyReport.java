package co.edu.unipamplona.villadent.modules.reports.domain.model;

import java.time.LocalDate;

/** One calendar day of the report. Days without appointments carry zero counts. */
public record DailyReport(LocalDate date, ReportCounts counts) {

    public int total() {
        return counts.total();
    }

    public int getTotal() {
        return counts.total();
    }
}
