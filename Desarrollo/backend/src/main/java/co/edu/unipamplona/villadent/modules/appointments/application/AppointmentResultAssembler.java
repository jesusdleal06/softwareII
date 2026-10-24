package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.PatientResult;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ProcedureResult;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.GetReminderStatusUseCase;

/** Builds the staff-facing appointment view shared by the agenda and status changes. */
public class AppointmentResultAssembler {

    private final FindDentistUseCase dentists;
    private final FindProcedureUseCase procedures;
    private final FindPatientUseCase patients;
    private final GetReminderStatusUseCase reminderStatus;

    public AppointmentResultAssembler(
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            FindPatientUseCase patients,
            GetReminderStatusUseCase reminderStatus) {
        this.dentists = dentists;
        this.procedures = procedures;
        this.patients = patients;
        this.reminderStatus = reminderStatus;
    }

    public AppointmentResult assemble(Appointment appointment) {
        PatientResult patient = patients.findById(appointment.patientId()).orElse(null);
        DentistResult dentist = dentists.findById(appointment.dentistId()).orElse(null);
        ProcedureResult procedure = procedures.findById(appointment.procedureId()).orElse(null);
        var reminder = reminderStatus.statusFor(appointment.id()).orElse(null);
        return new AppointmentResult(
                appointment.id(),
                appointment.code(),
                appointment.patientId(),
                patient == null ? "" : patient.fullName(),
                patient == null ? "" : patient.phone(),
                appointment.dentistId(),
                dentist == null ? "" : dentist.name(),
                appointment.procedureId(),
                procedure == null ? "" : procedure.name(),
                appointment.date(),
                appointment.time(),
                appointment.durationMinutes(),
                appointment.status(),
                appointment.origin(),
                reminder == null ? null : reminder.status(),
                reminder == null ? 0 : reminder.attempts());
    }
}
