package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ReminderAppointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

public class GetReminderAppointmentService implements GetReminderAppointmentUseCase {

    private final AppointmentRepository appointments;
    private final FindPatientUseCase patients;
    private final FindDentistUseCase dentists;
    private final FindProcedureUseCase procedures;
    private final Clock clock;

    public GetReminderAppointmentService(
            AppointmentRepository appointments,
            FindPatientUseCase patients,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            Clock clock) {
        this.appointments = appointments;
        this.patients = patients;
        this.dentists = dentists;
        this.procedures = procedures;
        this.clock = clock;
    }

    @Override
    public Optional<ReminderAppointment> find(Long appointmentId) {
        LocalDateTime now = LocalDateTime.now(clock);
        return appointments.findById(appointmentId).map(appointment -> toView(appointment, now));
    }

    private ReminderAppointment toView(Appointment appointment, LocalDateTime now) {
        var patient = patients.findById(appointment.patientId());
        return new ReminderAppointment(
                appointment.id(),
                appointment.code(),
                patient.map(value -> value.fullName()).orElse(""),
                patient.map(value -> value.phone()).orElse(""),
                dentists.findById(appointment.dentistId()).map(d -> d.name()).orElse(""),
                procedures.findById(appointment.procedureId()).map(p -> p.name()).orElse(""),
                appointment.date(),
                appointment.time(),
                appointment.occupiesSlot(),
                appointment.date().atTime(appointment.time()).isAfter(now),
                appointment.tokenHash());
    }
}
