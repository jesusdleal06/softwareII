package co.edu.unipamplona.villadent.modules.appointments.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.ActiveAppointmentExistsException;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase.BookAppointmentCommand;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase.ResolvePatientCommand;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BookAppointmentServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-23T12:00:00Z"), ZoneId.of("America/Bogota"));

    @Mock
    private FindDentistUseCase dentists;

    @Mock
    private ListSchedulesUseCase schedules;

    @Mock
    private FindProcedureUseCase procedures;

    @Mock
    private ResolvePatientUseCase patients;

    @Mock
    private AppointmentRepository appointments;

    private BookAppointmentService service;

    @BeforeEach
    void setUp() {
        service = new BookAppointmentService(dentists, schedules, procedures, patients, appointments, CLOCK);
    }

    private void activeDentistAndProcedure(int durationMinutes) {
        when(dentists.findById(1L)).thenReturn(Optional.of(
                new DentistResult(1L, "Dra. Laura Villamizar", "Odontología general", null, true)));
        when(procedures.findById(2L)).thenReturn(Optional.of(
                new ProcedureResult(2L, "Limpieza", durationMinutes, true)));
        when(schedules.listByDentist(1L)).thenReturn(List.of(
                new ScheduleResult(1L, 1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0), true)));
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of());
    }

    private BookAppointmentCommand command(LocalTime time, AppointmentOrigin origin) {
        return new BookAppointmentCommand(
                "Ana María Rueda", "3001234567", 1L, 2L, MONDAY, time, origin);
    }

    @Test
    @DisplayName("CP-RF07-02: rejects a second active appointment for the same patient")
    void rejectsASecondActiveAppointment() {
        activeDentistAndProcedure(30);
        when(patients.resolve(new ResolvePatientCommand("Ana María Rueda", "3001234567")))
                .thenReturn(new PatientResult(5L, "Ana María Rueda", "3001234567", true));
        when(appointments.countActiveByPatientFrom(5L, LocalDate.of(2026, 10, 23))).thenReturn(1L);

        assertThatThrownBy(() -> service.book(command(LocalTime.of(9, 0), AppointmentOrigin.WEB)))
                .isInstanceOf(ActiveAppointmentExistsException.class)
                .hasMessage(ActiveAppointmentExistsException.MESSAGE);

        verify(appointments, never()).save(any());
    }

    @Test
    @DisplayName("CP-RF04-03: does not offer a 60-minute slot when only 30 minutes are free")
    void doesNotChooseASlotThatDoesNotFit() {
        activeDentistAndProcedure(60);
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of(
                new Appointment(
                        null,
                        "VD-1001",
                        8L,
                        1L,
                        2L,
                        MONDAY,
                        LocalTime.of(9, 30),
                        30,
                        AppointmentStatus.CONFIRMADA,
                        AppointmentOrigin.WEB,
                        null)));

        assertThatThrownBy(() -> service.book(command(LocalTime.of(9, 0), AppointmentOrigin.WEB)))
                .isInstanceOf(SlotTakenException.class)
                .hasMessage(Appointment.PUBLIC_CONFLICT);
    }

    @Test
    void storesTheProcedureDurationAndThePublicConflictMessage() {
        activeDentistAndProcedure(45);
        when(patients.resolve(any())).thenReturn(
                new PatientResult(5L, "Ana María Rueda", "3001234567", true));
        when(appointments.countActiveByPatientFrom(5L, LocalDate.of(2026, 10, 23))).thenReturn(0L);
        when(appointments.nextCode()).thenReturn("VD-1001");
        when(appointments.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment appointment = invocation.getArgument(0);
            return new Appointment(
                    7L,
                    appointment.code(),
                    appointment.patientId(),
                    appointment.dentistId(),
                    appointment.procedureId(),
                    appointment.date(),
                    appointment.time(),
                    appointment.durationMinutes(),
                    appointment.status(),
                    appointment.origin(),
                    appointment.tokenHash());
        });

        AppointmentResult result = service.book(command(LocalTime.of(10, 0), AppointmentOrigin.WEB));

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.code()).isEqualTo("VD-1001");
        assertThat(result.durationMinutes()).isEqualTo(45);
        assertThat(result.status()).isEqualTo(AppointmentStatus.PENDIENTE);
        assertThat(result.dentistName()).isEqualTo("Dra. Laura Villamizar");

        ArgumentCaptor<Appointment> saved = ArgumentCaptor.forClass(Appointment.class);
        verify(appointments).save(saved.capture());
        assertThat(saved.getValue().origin()).isEqualTo(AppointmentOrigin.WEB);
        assertThat(saved.getValue().durationMinutes()).isEqualTo(45);
    }

    @Test
    void usesTheStaffConflictMessageForManualBookings() {
        activeDentistAndProcedure(30);
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of(
                new Appointment(
                        null,
                        "VD-1001",
                        8L,
                        1L,
                        2L,
                        MONDAY,
                        LocalTime.of(9, 0),
                        30,
                        AppointmentStatus.CONFIRMADA,
                        AppointmentOrigin.WEB,
                        null)));

        assertThatThrownBy(() -> service.book(command(LocalTime.of(9, 0), AppointmentOrigin.MANUAL)))
                .isInstanceOf(SlotTakenException.class)
                .hasMessage(Appointment.STAFF_CONFLICT);
    }
}
