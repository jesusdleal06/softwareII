package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentReportRow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAppointmentReportUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class GetAppointmentReportService implements GetAppointmentReportUseCase {

    private final AppointmentRepository appointments;

    public GetAppointmentReportService(AppointmentRepository appointments) {
        this.appointments = appointments;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentReportRow> between(LocalDate from, LocalDate to, Long dentistId) {
        return appointments.findForReport(from, to, dentistId).stream()
                .map(appointment -> new AppointmentReportRow(appointment.date(), appointment.status()))
                .toList();
    }
}
