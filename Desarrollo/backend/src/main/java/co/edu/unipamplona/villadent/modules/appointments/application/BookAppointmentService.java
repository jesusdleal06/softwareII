package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.ActiveAppointmentExistsException;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AvailabilityCalculator;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.TimeWindow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class BookAppointmentService implements BookAppointmentUseCase {

    private final FindDentistUseCase dentists;
    private final ListSchedulesUseCase schedules;
    private final FindProcedureUseCase procedures;
    private final ResolvePatientUseCase patients;
    private final AppointmentRepository appointments;
    private final Clock clock;

    public BookAppointmentService(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            ResolvePatientUseCase patients,
            AppointmentRepository appointments,
            Clock clock) {
        this.dentists = dentists;
        this.schedules = schedules;
        this.procedures = procedures;
        this.patients = patients;
        this.appointments = appointments;
        this.clock = clock;
    }

    @Override
    @Transactional
    public AppointmentResult book(BookAppointmentCommand command) {
        DentistResult dentist = dentists.findById(command.dentistId())
                .filter(DentistResult::active)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        ProcedureResult procedure = procedures.findById(command.procedureId())
                .filter(ProcedureResult::active)
                .orElseThrow(() -> new NotFoundException("No se encontró el procedimiento."));

        LocalDateTime now = LocalDateTime.now(clock);
        List<Appointment> booked = appointments.findByDentistIdAndDate(dentist.id(), command.date());
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                command.date(), now, procedure.durationMinutes(), windows(dentist.id(), command.date()), booked);
        if (!slots.contains(command.time())) {
            throw new SlotTakenException(conflictMessage(command.origin()));
        }

        PatientResult patient = patients.resolve(
                new ResolvePatientUseCase.ResolvePatientCommand(command.patientName(), command.patientPhone()));
        if (appointments.countActiveByPatientFrom(patient.id(), now.toLocalDate()) > 0) {
            throw new ActiveAppointmentExistsException();
        }

        Appointment appointment = Appointment.book(
                appointments.nextCode(),
                patient.id(),
                dentist.id(),
                procedure.id(),
                command.date(),
                command.time(),
                procedure.durationMinutes(),
                command.origin());
        appointment.ensureNoOverlap(booked);
        Appointment saved = appointments.save(appointment);
        return toResult(saved, patient, dentist, procedure);
    }

    private List<TimeWindow> windows(Long dentistId, java.time.LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        return schedules.listByDentist(dentistId).stream()
                .filter(ScheduleResult::active)
                .filter(schedule -> schedule.dayOfWeek() == dayOfWeek)
                .map(schedule -> new TimeWindow(schedule.start(), schedule.end()))
                .toList();
    }

    private static String conflictMessage(AppointmentOrigin origin) {
        return origin == AppointmentOrigin.MANUAL
                ? Appointment.STAFF_CONFLICT
                : Appointment.PUBLIC_CONFLICT;
    }

    static AppointmentResult toResult(
            Appointment appointment,
            PatientResult patient,
            DentistResult dentist,
            ProcedureResult procedure) {
        return new AppointmentResult(
                appointment.id(),
                appointment.code(),
                patient.id(),
                patient.fullName(),
                patient.phone(),
                dentist.id(),
                dentist.name(),
                procedure.id(),
                procedure.name(),
                appointment.date(),
                appointment.time(),
                appointment.durationMinutes(),
                appointment.status(),
                appointment.origin());
    }
}
