package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AvailabilityCalculator;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.TimeWindow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ManageAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ManagedAppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ManageAppointmentService implements ManageAppointmentUseCase {

    private final AppointmentRepository appointments;
    private final FindPatientUseCase patients;
    private final FindDentistUseCase dentists;
    private final FindProcedureUseCase procedures;
    private final ListSchedulesUseCase schedules;
    private final ScheduleReminderUseCase scheduleReminder;
    private final CancelReminderUseCase cancelReminder;
    private final ManageTokenGenerator tokenGenerator;
    private final Clock clock;

    public ManageAppointmentService(
            AppointmentRepository appointments,
            FindPatientUseCase patients,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            ListSchedulesUseCase schedules,
            ScheduleReminderUseCase scheduleReminder,
            CancelReminderUseCase cancelReminder,
            ManageTokenGenerator tokenGenerator,
            Clock clock) {
        this.appointments = appointments;
        this.patients = patients;
        this.dentists = dentists;
        this.procedures = procedures;
        this.schedules = schedules;
        this.scheduleReminder = scheduleReminder;
        this.cancelReminder = cancelReminder;
        this.tokenGenerator = tokenGenerator;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public ManagedAppointmentResult view(String token) {
        return toResult(load(token));
    }

    @Override
    @Transactional
    public ManagedAppointmentResult confirm(String token) {
        Appointment appointment = load(token).confirm();
        return toResult(appointments.save(appointment));
    }

    @Override
    @Transactional
    public ManagedAppointmentResult cancel(String token) {
        Appointment appointment = load(token).cancel();
        Appointment saved = appointments.save(appointment);
        cancelReminder.cancel(saved.id());
        return toResult(saved);
    }

    @Override
    @Transactional
    public ManagedAppointmentResult reschedule(String token, LocalDate date, LocalTime time) {
        Appointment appointment = load(token);
        LocalDateTime now = LocalDateTime.now(clock);
        List<Appointment> booked = appointments
                .findByDentistIdAndDate(appointment.dentistId(), date)
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
            throw new SlotTakenException(Appointment.PUBLIC_CONFLICT);
        }
        Appointment saved;
        try {
            saved = appointments.save(appointment.reschedule(date, time));
        } catch (SlotTakenException exception) {
            // The manage link always speaks the patient's message, whatever the origin.
            throw new SlotTakenException(Appointment.PUBLIC_CONFLICT);
        }
        scheduleReminder.schedule(saved.id());
        return toResult(saved);
    }

    private Appointment load(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new NotFoundException("No se encontró la cita.");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        return appointments.findByTokenHash(tokenGenerator.hash(rawToken))
                .filter(appointment -> appointment.canBeManaged(now))
                .orElseThrow(() -> new NotFoundException("No se encontró la cita."));
    }

    private List<TimeWindow> windows(Long dentistId, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        return schedules.listByDentist(dentistId).stream()
                .filter(ScheduleResult::active)
                .filter(schedule -> schedule.dayOfWeek() == dayOfWeek)
                .map(schedule -> new TimeWindow(schedule.start(), schedule.end()))
                .toList();
    }

    private ManagedAppointmentResult toResult(Appointment appointment) {
        PatientResult patient = patients.findById(appointment.patientId()).orElse(null);
        DentistResult dentist = dentists.findById(appointment.dentistId()).orElse(null);
        ProcedureResult procedure = procedures.findById(appointment.procedureId()).orElse(null);
        return new ManagedAppointmentResult(
                appointment.id(),
                appointment.code(),
                appointment.dentistId(),
                appointment.procedureId(),
                patient == null ? "" : patient.fullName(),
                patient == null ? "" : patient.phone(),
                dentist == null ? "" : dentist.name(),
                procedure == null ? "" : procedure.name(),
                appointment.date(),
                appointment.time(),
                appointment.durationMinutes(),
                appointment.status().name());
    }
}
