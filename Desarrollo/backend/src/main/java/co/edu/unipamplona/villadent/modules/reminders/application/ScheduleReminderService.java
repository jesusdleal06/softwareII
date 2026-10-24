package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ReminderAppointment;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderSchedule;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class ScheduleReminderService implements ScheduleReminderUseCase {

    private final GetReminderAppointmentUseCase appointments;
    private final ReminderRepository reminders;
    private final ReminderDeliveryService delivery;
    private final CancelReminderUseCase cancelReminder;
    private final Clock clock;

    public ScheduleReminderService(
            GetReminderAppointmentUseCase appointments,
            ReminderRepository reminders,
            ReminderDeliveryService delivery,
            CancelReminderUseCase cancelReminder,
            Clock clock) {
        this.appointments = appointments;
        this.reminders = reminders;
        this.delivery = delivery;
        this.cancelReminder = cancelReminder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void schedule(Long appointmentId) {
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<ReminderAppointment> appointment = appointments.find(appointmentId);
        if (appointment.isEmpty()
                || !appointment.get().active()
                || !appointment.get().future()) {
            cancelReminder.cancel(appointmentId);
            return;
        }
        ReminderAppointment view = appointment.get();
        LocalDateTime scheduledFor = ReminderSchedule.dueAtOrNow(view.date(), view.time(), now);
        reminders.findProgrammedByAppointmentId(appointmentId)
                .ifPresent(existing -> {
                    reminders.save(existing.cancelled());
                    reminders.flush();
                });
        Reminder saved = reminders.save(Reminder.scheduled(appointmentId, scheduledFor));
        if (saved.isDue(now)) {
            delivery.deliver(saved.id());
        }
    }
}
