package co.edu.unipamplona.villadent.modules.appointments.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase.AvailabilityQuery;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class GetAvailabilityServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-23T12:00:00Z"), ZoneId.of("America/Bogota"));

    private final FindDentistUseCase dentists = org.mockito.Mockito.mock(FindDentistUseCase.class);
    private final ListSchedulesUseCase schedules = org.mockito.Mockito.mock(ListSchedulesUseCase.class);
    private final FindProcedureUseCase procedures = org.mockito.Mockito.mock(FindProcedureUseCase.class);
    private final AppointmentRepository appointments = org.mockito.Mockito.mock(AppointmentRepository.class);

    private final GetAvailabilityService service =
            new GetAvailabilityService(dentists, schedules, procedures, appointments, CLOCK);

    @Test
    void excludesTheSlotOfAnOccupyingAppointment() {
        when(dentists.findById(1L)).thenReturn(Optional.of(
                new DentistResult(1L, "Dra. Laura Villamizar", "Odontología general", null, true)));
        when(procedures.findById(2L)).thenReturn(Optional.of(
                new ProcedureResult(2L, "Limpieza", 30, true)));
        when(schedules.listByDentist(1L)).thenReturn(List.of(
                new ScheduleResult(1L, 1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0), true)));
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of(
                new Appointment(
                        null,
                        "VD-0001",
                        9L,
                        1L,
                        2L,
                        MONDAY,
                        LocalTime.of(10, 0),
                        30,
                        AppointmentStatus.CONFIRMADA,
                        AppointmentOrigin.WEB,
                        "hash")));

        var result = service.get(new AvailabilityQuery(1L, MONDAY, 2L));

        assertThat(result.slots()).contains(LocalTime.of(8, 0), LocalTime.of(10, 30));
        assertThat(result.slots()).doesNotContain(LocalTime.of(10, 0));
    }

    @Test
    void rejectsAnInactiveDentist() {
        when(dentists.findById(1L)).thenReturn(Optional.of(
                new DentistResult(1L, "Dra. Laura Villamizar", "Odontología general", null, false)));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> service.get(new AvailabilityQuery(1L, MONDAY, 2L)))
                .isInstanceOf(co.edu.unipamplona.villadent.shared.error.NotFoundException.class)
                .hasMessage("No se encontró el odontólogo.");
    }
}
