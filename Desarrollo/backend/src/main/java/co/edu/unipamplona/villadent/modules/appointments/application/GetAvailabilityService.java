package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AvailabilityCalculator;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.TimeWindow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class GetAvailabilityService implements GetAvailabilityUseCase {

    private final FindDentistUseCase dentists;
    private final ListSchedulesUseCase schedules;
    private final FindProcedureUseCase procedures;
    private final AppointmentRepository appointments;
    private final Clock clock;

    public GetAvailabilityService(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            AppointmentRepository appointments,
            Clock clock) {
        this.dentists = dentists;
        this.schedules = schedules;
        this.procedures = procedures;
        this.appointments = appointments;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public AvailabilityResult get(AvailabilityQuery query) {
        DentistResult dentist = dentists.findById(query.dentistId())
                .filter(DentistResult::active)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        ProcedureResult procedure = procedures.findById(query.procedureId())
                .filter(ProcedureResult::active)
                .orElseThrow(() -> new NotFoundException("No se encontró el procedimiento."));

        LocalDateTime now = LocalDateTime.now(clock);
        if (query.date().isBefore(now.toLocalDate())) {
            return new AvailabilityResult(
                    dentist.id(), query.date(), procedure.id(), List.of());
        }

        int dayOfWeek = query.date().getDayOfWeek().getValue();
        List<TimeWindow> windows = schedules.listByDentist(dentist.id()).stream()
                .filter(ScheduleResult::active)
                .filter(schedule -> schedule.dayOfWeek() == dayOfWeek)
                .map(schedule -> new TimeWindow(schedule.start(), schedule.end()))
                .toList();
        List<Appointment> booked = appointments.findByDentistIdAndDate(dentist.id(), query.date());
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                query.date(), now, procedure.durationMinutes(), windows, booked);
        return new AvailabilityResult(dentist.id(), query.date(), procedure.id(), slots);
    }
}
