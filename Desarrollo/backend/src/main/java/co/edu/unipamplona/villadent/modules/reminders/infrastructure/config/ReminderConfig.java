package co.edu.unipamplona.villadent.modules.reminders.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.reminders.application.CancelReminderService;
import co.edu.unipamplona.villadent.modules.reminders.application.GetReminderStatusService;
import co.edu.unipamplona.villadent.modules.reminders.application.ManageLinkIssuer;
import co.edu.unipamplona.villadent.modules.reminders.application.ReminderDeliveryService;
import co.edu.unipamplona.villadent.modules.reminders.application.ScheduleReminderService;
import co.edu.unipamplona.villadent.modules.reminders.application.SendDueRemindersService;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.GetReminderStatusUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.SendDueRemindersUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import co.edu.unipamplona.villadent.modules.reminders.infrastructure.security.SecureManageTokenAdapter;
import co.edu.unipamplona.villadent.modules.reminders.infrastructure.whatsapp.WhatsAppReminderSender;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class ReminderConfig {

    @Bean
    public ManageTokenGenerator manageTokenGenerator() {
        return new SecureManageTokenAdapter();
    }

    @Bean
    @Profile("!e2e")
    public ReminderSender reminderSender(
            @Value("${app.whatsapp.api-url:https://graph.facebook.com/v21.0}") String apiUrl,
            @Value("${app.whatsapp.token:}") String token,
            @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${app.whatsapp.template-name:}") String templateName) {
        return new WhatsAppReminderSender(apiUrl, token, phoneNumberId, templateName);
    }

    @Bean
    public ManageLinkIssuer manageLinkIssuer(
            AttachManageTokenUseCase attachManageToken,
            ManageTokenGenerator tokenGenerator,
            @Value("${app.manage-link-base:http://localhost:4200/cita/}") String manageLinkBase) {
        return new ManageLinkIssuer(attachManageToken, tokenGenerator, manageLinkBase);
    }

    @Bean
    public ReminderDeliveryService reminderDeliveryService(
            ReminderRepository reminders,
            GetReminderAppointmentUseCase appointments,
            ManageLinkIssuer manageLinks,
            ReminderSender sender,
            Clock clock) {
        return new ReminderDeliveryService(reminders, appointments, manageLinks, sender, clock);
    }

    @Bean
    public CancelReminderUseCase cancelReminderUseCase(ReminderRepository reminders) {
        return new CancelReminderService(reminders);
    }

    @Bean
    public ScheduleReminderUseCase scheduleReminderUseCase(
            GetReminderAppointmentUseCase appointments,
            ReminderRepository reminders,
            ReminderDeliveryService delivery,
            CancelReminderUseCase cancelReminder,
            Clock clock) {
        return new ScheduleReminderService(appointments, reminders, delivery, cancelReminder, clock);
    }

    @Bean
    public SendDueRemindersUseCase sendDueRemindersUseCase(
            ReminderRepository reminders,
            ReminderDeliveryService delivery,
            Clock clock) {
        return new SendDueRemindersService(reminders, delivery, clock);
    }

    @Bean
    public GetReminderStatusUseCase getReminderStatusUseCase(ReminderRepository reminders) {
        return new GetReminderStatusService(reminders);
    }
}
