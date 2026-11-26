package co.edu.unipamplona.villadent.shared.e2e;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.reminders.application.ManageLinkIssuer;
import co.edu.unipamplona.villadent.modules.reminders.application.ManageLinkIssuer.ManageLink;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("e2e")
public class E2eManageLinkController {

    public static final String PATH = "/api/v1/e2e/appointments/{id}/manage-link";

    private final GetReminderAppointmentUseCase appointments;
    private final ManageLinkIssuer manageLinks;

    public E2eManageLinkController(GetReminderAppointmentUseCase appointments, ManageLinkIssuer manageLinks) {
        this.appointments = appointments;
        this.manageLinks = manageLinks;
    }

    @PostMapping(PATH)
    public ResponseEntity<ManageLink> issue(@PathVariable Long id) {
        var appointment = appointments.find(id)
                .filter(view -> view.active() && view.future())
                .orElseThrow(() -> new NotFoundException("No se encontró la cita."));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(manageLinks.issue(appointment.id()));
    }
}
