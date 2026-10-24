package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.AppointmentNotManageableException;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AvailabilityCalculator;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.TimeWindow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.RescheduleStaffAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.shared.error.ForbiddenException;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class RescheduleStaffAppointmentService implements RescheduleStaffAppointmentUseCase {

    private final AppointmentRepository appointments;
    private final ListSchedulesUseCase schedules;
    private final ScheduleReminderUseCase scheduleReminder;
    private final AppointmentResultAssembler assembler;
    private final Clock clock;

    public RescheduleStaffAppointmentService(
            AppointmentRepository appointments,
            ListSchedulesUseCase schedules,
            ScheduleReminderUseCase scheduleReminder,
            AppointmentResultAssembler assembler,
            Clock clock) {
        this.appointments = appointments;
        this.schedules = schedules;
        this.scheduleReminder = scheduleReminder;
        this.assembler = assembler;
        this.clock = clock;
    }

    @Override
    @Transactional
    public AppointmentResult reschedule(
            Long appointmentId, LocalDate date, LocalTime time, Long dentistScope) {
        Appointment appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("No se encontró la cita."));
        if (dentistScope != null && !dentistScope.equals(appointment.dentistId())) {
            throw new ForbiddenException("No puedes cambiar la cita de otro odontólogo.");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        if (!appointment.canBeManaged(now)) {
            throw new AppointmentNotManageableException();
        }
        List<Appointment> booked = appointments.findByDentistIdAndDate(appointment.dentistId(), date)
                .stream()
                .filter(other -> !other.id().equals(appointment.id()))
                .toList();
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                date,
                now,
                appointment.durationMinutes(),
                windows(appointment.dentistId(), date),
                booked);
        if (!slots.contains(time)) {
            throw new SlotTakenException(appointment.conflictMessage());
        }
        Appointment saved = appointments.save(appointment.reschedule(date, time));
        scheduleReminder.schedule(saved.id());
        return assembler.assemble(saved);
    }

    private List<TimeWindow> windows(Long dentistId, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        return schedules.listByDentist(dentistId).stream()
                .filter(ScheduleResult::active)
                .filter(schedule -> schedule.dayOfWeek() == dayOfWeek)
                .map(schedule -> new TimeWindow(schedule.start(), schedule.end()))
                .toList();
    }
}
