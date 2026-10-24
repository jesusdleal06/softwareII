package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ChangeAppointmentStatusUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.shared.error.ForbiddenException;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class ChangeAppointmentStatusService implements ChangeAppointmentStatusUseCase {

    private final AppointmentRepository appointments;
    private final CancelReminderUseCase cancelReminder;
    private final AppointmentResultAssembler assembler;

    public ChangeAppointmentStatusService(
            AppointmentRepository appointments,
            CancelReminderUseCase cancelReminder,
            AppointmentResultAssembler assembler) {
        this.appointments = appointments;
        this.cancelReminder = cancelReminder;
        this.assembler = assembler;
    }

    @Override
    @Transactional
    public AppointmentResult changeStatus(Long appointmentId, AppointmentStatus status, Long dentistScope) {
        Appointment appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("No se encontró la cita."));
        if (dentistScope != null && !dentistScope.equals(appointment.dentistId())) {
            throw new ForbiddenException("No puedes cambiar la cita de otro odontólogo.");
        }
        Appointment changed = appointments.save(appointment.withStatus(status));
        if (status != AppointmentStatus.CONFIRMADA) {
            cancelReminder.cancel(changed.id());
        }
        return assembler.assemble(changed);
    }
}
