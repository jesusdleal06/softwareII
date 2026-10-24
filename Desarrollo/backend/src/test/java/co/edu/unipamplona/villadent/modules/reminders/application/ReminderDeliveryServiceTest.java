package co.edu.unipamplona.villadent.modules.reminders.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ReminderAppointment;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
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
class ReminderDeliveryServiceTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-26T14:00:00Z"), ZoneId.of("America/Bogota"));
    private static final LocalDate DAY = LocalDate.of(2026, 10, 26);

    @Mock
    private ReminderRepository reminders;

    @Mock
    private GetReminderAppointmentUseCase appointments;

    @Mock
    private AttachManageTokenUseCase attachManageToken;

    @Mock
    private ManageTokenGenerator tokenGenerator;

    @Mock
    private ReminderSender sender;

    private ReminderDeliveryService service;

    @BeforeEach
    void setUp() {
        service = new ReminderDeliveryService(
                reminders, appointments, attachManageToken, tokenGenerator, sender,
                CLOCK, "http://localhost:4200/cita/");
    }

    private Reminder programmed() {
        return new Reminder(9L, 7L, LocalDateTime.of(2026, 10, 26, 8, 0),
                null, ReminderStatus.PROGRAMADO, 0, null);
    }

    private ReminderAppointment view(boolean active, boolean future) {
        return new ReminderAppointment(
                7L, "VD-1001", "Ana María Rueda", "3001234567", "Dra. Laura Villamizar",
                "Limpieza", DAY, LocalTime.of(10, 0), active, future, null);
    }

    @Test
    void anUnknownReminderIsIgnored() {
        when(reminders.findById(9L)).thenReturn(Optional.empty());

        service.deliver(9L);

        verify(sender, never()).send(any());
    }

    @Test
    void anAlreadyHandledReminderIsIgnored() {
        when(reminders.findById(9L)).thenReturn(Optional.of(new Reminder(
                9L, 7L, LocalDateTime.of(2026, 10, 26, 8, 0), LocalDateTime.now(CLOCK),
                ReminderStatus.ENVIADO, 1, null)));

        service.deliver(9L);

        verify(sender, never()).send(any());
    }

    @Test
    void aCancelledAppointmentCancelsTheReminder() {
        when(reminders.findById(9L)).thenReturn(Optional.of(programmed()));
        when(appointments.find(7L)).thenReturn(Optional.of(view(false, true)));
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.deliver(9L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(ReminderStatus.CANCELADO);
    }

    @Test
    void aSuccessfulSendAttachesTheTokenAndMarksTheReminderSent() {
        when(reminders.findById(9L)).thenReturn(Optional.of(programmed()));
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(tokenGenerator.generate()).thenReturn("raw-token");
        when(tokenGenerator.hash("raw-token")).thenReturn("hashed-token");
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.deliver(9L);

        verify(attachManageToken).attach(7L, "hashed-token");
        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(ReminderStatus.ENVIADO);
        verify(sender).send(org.mockito.ArgumentMatchers.argThat(
                message -> message.manageUrl().equals("http://localhost:4200/cita/raw-token")));
    }

    @Test
    void aFailedSendRecordsTheErrorAndSchedulesARetry() {
        when(reminders.findById(9L)).thenReturn(Optional.of(programmed()));
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(tokenGenerator.generate()).thenReturn("raw-token");
        when(tokenGenerator.hash("raw-token")).thenReturn("hashed-token");
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doThrow(new IllegalStateException("No se pudo enviar"))
                .when(sender).send(any());

        service.deliver(9L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(ReminderStatus.PROGRAMADO);
        assertThat(saved.getValue().attempts()).isEqualTo(1);
        assertThat(saved.getValue().lastError()).isEqualTo("No se pudo enviar");
    }

    @Test
    void anEmptyErrorMessageFallsBackToTheExceptionType() {
        when(reminders.findById(9L)).thenReturn(Optional.of(programmed()));
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(tokenGenerator.generate()).thenReturn("raw-token");
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doThrow(new IllegalStateException())
                .when(sender).send(any());

        service.deliver(9L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().lastError()).isEqualTo("IllegalStateException");
    }

    @Test
    void aLongErrorMessageIsTruncated() {
        when(reminders.findById(9L)).thenReturn(Optional.of(programmed()));
        when(appointments.find(7L)).thenReturn(Optional.of(view(true, true)));
        when(tokenGenerator.generate()).thenReturn("raw-token");
        when(reminders.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doThrow(new IllegalStateException("x".repeat(600)))
                .when(sender).send(any());

        service.deliver(9L);

        ArgumentCaptor<Reminder> saved = ArgumentCaptor.forClass(Reminder.class);
        verify(reminders).save(saved.capture());
        assertThat(saved.getValue().lastError()).hasSize(500);
    }
}
