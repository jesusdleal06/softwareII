package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;

public class ManageLinkIssuer {

    private final AttachManageTokenUseCase attachManageToken;
    private final ManageTokenGenerator tokenGenerator;
    private final String manageLinkBase;

    public ManageLinkIssuer(
            AttachManageTokenUseCase attachManageToken,
            ManageTokenGenerator tokenGenerator,
            String manageLinkBase) {
        this.attachManageToken = attachManageToken;
        this.tokenGenerator = tokenGenerator;
        this.manageLinkBase = manageLinkBase;
    }

    public ManageLink issue(Long appointmentId) {
        String token = tokenGenerator.generate();
        attachManageToken.attach(appointmentId, tokenGenerator.hash(token));
        return new ManageLink(token, manageLinkBase + token);
    }

    public record ManageLink(String token, String url) {}
}
