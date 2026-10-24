package co.edu.unipamplona.villadent.modules.reminders.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SimpleReminderServicesTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-26T14:00:00Z"), ZoneId.of("America/Bogota"));

    @Mock
    private ReminderRepository reminders;

    @Mock
    private ReminderDeliveryService delivery;

    private CancelReminderService cancel;

    private SendDueRemindersService send;

    private GetReminderStatusService status;

    @BeforeEach
    void setUp() {
        cancel = new CancelReminderService(reminders);
        send = new SendDueRemindersService(reminders, delivery, CLOCK);
        status = new GetReminderStatusService(reminders);
    }

    private Reminder reminder(ReminderStatus state) {
        return new Reminder(1L, 7L, LocalDateTime.of(2026, 10, 26, 8, 0),
                null, state, 2, "error");
    }

    @Test
    void cancelDoesNothingWithoutAProgrammedReminder() {
        when(reminders.findProgrammedByAppointmentId(7L)).thenReturn(Optional.empty());

        cancel.cancel(7L);

        verify(reminders, never()).save(any());
    }

    @Test
    void cancelMarksTheProgrammedReminder() {
        when(reminders.findProgrammedByAppointmentId(7L))
                .thenReturn(Optional.of(reminder(ReminderStatus.PROGRAMADO)));
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        cancel.cancel(7L);

        verify(reminders).save(org.mockito.ArgumentMatchers.argThat(
                value -> value.status() == ReminderStatus.CANCELADO));
    }

    @Test
    void sendDueDeliversEveryDueReminder() {
        when(reminders.findDue(any())).thenReturn(List.of(
                reminder(ReminderStatus.PROGRAMADO), reminder(ReminderStatus.PROGRAMADO)));
        assertThat(send.sendDue()).isEqualTo(2);
        verify(delivery, org.mockito.Mockito.times(2)).deliver(1L);
    }

    @Test
    void sendDueWithNothingToSendDoesNothing() {
        when(reminders.findDue(any())).thenReturn(List.of());

        assertThat(send.sendDue()).isZero();
        verify(delivery, never()).deliver(any());
    }

    @Test
    void statusIsEmptyWhenThereIsNoReminder() {
        when(reminders.findLatestByAppointmentId(7L)).thenReturn(Optional.empty());

        assertThat(status.statusFor(7L)).isEmpty();
    }

    @Test
    void statusReportsTheLatestReminder() {
        when(reminders.findLatestByAppointmentId(7L))
                .thenReturn(Optional.of(reminder(ReminderStatus.FALLIDO)));

        var result = status.statusFor(7L).orElseThrow();

        assertThat(result.status()).isEqualTo("FALLIDO");
        assertThat(result.attempts()).isEqualTo(2);
        assertThat(result.lastError()).isEqualTo("error");
    }
}
