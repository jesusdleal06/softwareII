package co.edu.unipamplona.villadent.modules.reports.domain.model;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentReportRow;
import co.edu.unipamplona.villadent.modules.reports.domain.error.InvalidDateRangeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Consolidated administrative report for a date range and an optional dentist. */
public final class Report {

    private final LocalDate from;
    private final LocalDate to;
    private final Long dentistId;
    private final ReportCounts totals;
    private final List<DailyReport> daily;

    private Report(
            LocalDate from,
            LocalDate to,
            Long dentistId,
            ReportCounts totals,
            List<DailyReport> daily) {
        this.from = from;
        this.to = to;
        this.dentistId = dentistId;
        this.totals = totals;
        this.daily = List.copyOf(daily);
    }

    public static Report build(
            LocalDate from,
            LocalDate to,
            Long dentistId,
            List<AppointmentReportRow> rows) {
        requireValidRange(from, to);

        Map<LocalDate, int[]> countsByDate = new HashMap<>();
        for (AppointmentReportRow row : rows) {
            countsByDate
                    .computeIfAbsent(row.date(), ignored -> new int[AppointmentStatus.values().length])
                    [row.status().ordinal()]++;
        }

        List<DailyReport> daily = new ArrayList<>();
        int[] total = new int[AppointmentStatus.values().length];
        LocalDate date = from;
        while (!date.isAfter(to)) {
            int[] counts = countsByDate.getOrDefault(date, new int[AppointmentStatus.values().length]);
            daily.add(new DailyReport(date, toCounts(counts)));
            accumulate(total, counts);
            date = date.plusDays(1);
        }

        return new Report(from, to, dentistId, toCounts(total), daily);
    }

    public static void requireValidRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new InvalidDateRangeException();
        }
    }

    private static void accumulate(int[] total, int[] counts) {
        for (int index = 0; index < total.length; index++) {
            total[index] += counts[index];
        }
    }

    private static ReportCounts toCounts(int[] counts) {
        return new ReportCounts(
                counts[AppointmentStatus.PENDIENTE.ordinal()],
                counts[AppointmentStatus.CONFIRMADA.ordinal()],
                counts[AppointmentStatus.REPROGRAMADA.ordinal()],
                counts[AppointmentStatus.CANCELADA.ordinal()],
                counts[AppointmentStatus.ATENDIDA.ordinal()],
                counts[AppointmentStatus.NO_ASISTIO.ordinal()]);
    }

    public LocalDate from() {
        return from;
    }

    public LocalDate getFrom() {
        return from;
    }

    public LocalDate to() {
        return to;
    }

    public LocalDate getTo() {
        return to;
    }

    public Long dentistId() {
        return dentistId;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public int total() {
        return totals.total();
    }

    public int getTotal() {
        return totals.total();
    }

    public int attended() {
        return totals.attended();
    }

    public int getAttended() {
        return totals.attended();
    }

    public int cancelled() {
        return totals.cancelled();
    }

    public int getCancelled() {
        return totals.cancelled();
    }

    public int noShow() {
        return totals.noShow();
    }

    public int getNoShow() {
        return totals.noShow();
    }

    public int noShowRate() {
        int finished = totals.attended() + totals.noShow();
        return finished == 0 ? 0 : (int) Math.round(totals.noShow() * 100.0 / finished);
    }

    public int getNoShowRate() {
        return noShowRate();
    }

    public ReportCounts totals() {
        return totals;
    }

    public List<DailyReport> daily() {
        return daily;
    }

    public List<DailyReport> getDaily() {
        return daily;
    }
}
