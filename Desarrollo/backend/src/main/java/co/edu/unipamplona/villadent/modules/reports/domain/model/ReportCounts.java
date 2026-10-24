package co.edu.unipamplona.villadent.modules.reports.domain.model;

/** Appointment counts for one day, split by the six appointment statuses. */
public record ReportCounts(
        int pending,
        int confirmed,
        int rescheduled,
        int cancelled,
        int attended,
        int noShow) {

    public static ReportCounts empty() {
        return new ReportCounts(0, 0, 0, 0, 0, 0);
    }

    public int total() {
        return pending + confirmed + rescheduled + cancelled + attended + noShow;
    }
}
