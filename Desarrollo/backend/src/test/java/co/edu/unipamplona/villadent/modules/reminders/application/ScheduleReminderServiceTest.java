package co.edu.unipamplona.villadent.modules.reminders.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ReminderAppointment;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ScheduleReminderServiceTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-20T15:00:00Z"), ZoneId.of("America/Bogota"));
    private static final LocalDate DAY = LocalDate.of(2026, 10, 26);

    @Mock
    private GetReminderAppointmentUseCase appointments;

    @Mock
    private ReminderRepository reminders;

    @Mock
    private ReminderDeliveryService delivery;

    @Mock
    private CancelReminderUseCase cancelReminder;

    private ScheduleReminderService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleReminderService(appointments, reminders, delivery, cancelReminder, CLOCK);
    }

    private ReminderAppointment view(boolean active, boolean future) {
        return new ReminderAppointment(
                7L, "VD-1001", "Ana María Rueda", "3001234567", "Dra. Laura Villamizar",
                "Limpieza", DAY, LocalTime.of(9, 0), active, future, null);
    }

    @Test
    void aMissingAppointmentCancelsAnyProgrammedReminder() {
        when(appointments.find(7L)).thenReturn(Optional.empty());

        service.schedule(7L);

        verify(cancelReminder).cancel(7L);
        verify(reminders, never()).save(any());
    }

    @Test
    void anInactiveAppointmentCancelsTheReminder() {
        when(appointments.find(7L)).thenReturn(Optional.of(view(false, true)));

        service.schedule(7L);

        verify(cancelReminder).cancel(7L);
        verify(reminders, never()).save(any());
    }

    @Test
    void aPastAppointmentCancelsTheReminder() {
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, false)));

        service.schedule(7L);

        verify(cancelReminder).cancel(7L);
    }

    @Test
    void aFutureAppointmentIsProgrammedWithoutSending() {
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(reminders.findProgrammedByAppointmentId(7L)).thenReturn(Optional.empty());
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.schedule(7L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().scheduledFor())
                .isEqualTo(LocalDateTime.of(2026, 10, 25, 18, 0));
        assertThat(saved.getValue().status()).isEqualTo(ReminderStatus.PROGRAMADO);
        verify(delivery, never()).deliver(any());
    }

    @Test
    void anExistingProgrammedReminderIsCancelledBeforeSchedulingAgain() {
        Reminder existing = new Reminder(
                3L, 7L, LocalDateTime.of(2026, 10, 25, 18, 0), null,
                ReminderStatus.PROGRAMADO, 0, null);
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(reminders.findProgrammedByAppointmentId(7L)).thenReturn(Optional.of(existing));
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.schedule(7L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues().getFirst().status()).isEqualTo(ReminderStatus.CANCELADO);
        assertThat(saved.getAllValues().getLast().id()).isNull();
    }

    @Test
    void anAlreadyDueReminderIsDeliveredImmediately() {
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(reminders.findProgrammedByAppointmentId(7L)).thenReturn(Optional.empty());
        when(reminders.save(any())).thenAnswer(invocation -> {
            Reminder reminder = invocation.getArgument(0);
            return new Reminder(9L, reminder.appointmentId(), reminder.scheduledFor(),
                    null, ReminderStatus.PROGRAMADO, 0, null);
        });
        ScheduleReminderService dueService = new ScheduleReminderService(
                appointments, reminders, delivery, cancelReminder,
                Clock.fixed(Instant.parse("2026-10-26T14:00:00Z"), ZoneId.of("America/Bogota")));

        dueService.schedule(7L);

        verify(delivery).deliver(9L);
    }
}
