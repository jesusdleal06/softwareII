package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import co.edu.unipamplona.villadent.modules.reports.domain.model.DailyReport;
import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;

/** Renders the report as the CSV document the administrative user downloads. */
public final class ReportCsvWriter {

    private ReportCsvWriter() {}

    public static String write(Report report) {
        StringBuilder csv = new StringBuilder();
        line(csv, "Reporte de citas");
        line(csv, "Desde", report.from().toString());
        line(csv, "Hasta", report.to().toString());
        line(csv, "Odontólogo", report.dentistId() == null ? "Todos" : report.dentistId().toString());
        line(csv, "Total de citas", Integer.toString(report.total()));
        line(csv, "Pacientes atendidos", Integer.toString(report.attended()));
        line(csv, "Citas canceladas", Integer.toString(report.cancelled()));
        line(csv, "Inasistencias", Integer.toString(report.noShow()));
        line(csv, "Índice de inasistencia", report.noShowRate() + "%");
        line(csv, "Fecha", "Total", "Pendiente", "Confirmada", "Reprogramada",
                "Cancelada", "Atendida", "No asistió");
        for (DailyReport day : report.daily()) {
            line(csv,
                    day.date().toString(),
                    Integer.toString(day.total()),
                    Integer.toString(day.counts().pending()),
                    Integer.toString(day.counts().confirmed()),
                    Integer.toString(day.counts().rescheduled()),
                    Integer.toString(day.counts().cancelled()),
                    Integer.toString(day.counts().attended()),
                    Integer.toString(day.counts().noShow()));
        }
        return csv.toString();
    }

    private static void line(StringBuilder csv, String... values) {
        csv.append(String.join(",", values)).append('\n');
    }
}
