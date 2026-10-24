package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

public interface AttachManageTokenUseCase {

    void attach(Long appointmentId, String tokenHash);
}
