package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ReminderAppointment;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class ReminderDeliveryService {

    private static final int MAX_ATTEMPTS = 3;

    private final ReminderRepository reminders;
    private final GetReminderAppointmentUseCase appointments;
    private final AttachManageTokenUseCase attachManageToken;
    private final ManageTokenGenerator tokenGenerator;
    private final ReminderSender sender;
    private final Clock clock;
    private final String manageLinkBase;

    public ReminderDeliveryService(
            ReminderRepository reminders,
            GetReminderAppointmentUseCase appointments,
            AttachManageTokenUseCase attachManageToken,
            ManageTokenGenerator tokenGenerator,
            ReminderSender sender,
            Clock clock,
            String manageLinkBase) {
        this.reminders = reminders;
        this.appointments = appointments;
        this.attachManageToken = attachManageToken;
        this.tokenGenerator = tokenGenerator;
        this.sender = sender;
        this.clock = clock;
        this.manageLinkBase = manageLinkBase;
    }

    @Transactional
    public void deliver(Long reminderId) {
        Optional<Reminder> found = reminders.findById(reminderId);
        if (found.isEmpty() || found.get().status() != ReminderStatus.PROGRAMADO) {
            return;
        }
        Reminder reminder = found.get();
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<ReminderAppointment> appointment = appointments.find(reminder.appointmentId());
        if (appointment.isEmpty()
                || !appointment.get().active()
                || !appointment.get().future()) {
            reminders.save(reminder.cancelled());
            return;
        }
        ReminderAppointment view = appointment.get();
        String rawToken = tokenGenerator.generate();
        attachManageToken.attach(view.id(), tokenGenerator.hash(rawToken));
        try {
            sender.send(new ReminderMessage(
                    view.patientName(),
                    view.patientPhone(),
                    view.date(),
                    view.time(),
                    view.dentistName(),
                    view.procedureName(),
                    manageLinkBase + rawToken,
                    rawToken));
            reminders.save(reminder.sent(now));
        } catch (RuntimeException exception) {
            reminders.save(reminder.failed(errorMessage(exception), now, MAX_ATTEMPTS));
        }
    }

    private static String errorMessage(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = exception.getClass().getSimpleName();
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
