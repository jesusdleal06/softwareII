package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class AttachManageTokenService implements AttachManageTokenUseCase {

    private final AppointmentRepository appointments;

    public AttachManageTokenService(AppointmentRepository appointments) {
        this.appointments = appointments;
    }

    @Override
    @Transactional
    public void attach(Long appointmentId, String tokenHash) {
        var appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("No se encontró la cita."));
        appointments.save(appointment.withTokenHash(tokenHash));
    }
}
