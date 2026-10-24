package co.edu.unipamplona.villadent.modules.appointments.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.application.AttachManageTokenService;
import co.edu.unipamplona.villadent.modules.appointments.application.BookAppointmentService;
import co.edu.unipamplona.villadent.modules.appointments.application.GetReminderAppointmentService;
import co.edu.unipamplona.villadent.modules.appointments.application.ManageAppointmentService;
import co.edu.unipamplona.villadent.modules.appointments.application.GetAgendaService;
import co.edu.unipamplona.villadent.modules.appointments.application.GetAvailabilityService;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AttachManageTokenUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetReminderAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ManageAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAgendaUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.FindPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ResolvePatientUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.FindProcedureUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.GetReminderStatusUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ScheduleReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ManageTokenGenerator;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppointmentConfig {

    @Bean
    public GetAvailabilityUseCase getAvailabilityUseCase(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            AppointmentRepository appointments,
            Clock clock) {
        return new GetAvailabilityService(dentists, schedules, procedures, appointments, clock);
    }

    @Bean
    public BookAppointmentUseCase bookAppointmentUseCase(
            FindDentistUseCase dentists,
            ListSchedulesUseCase schedules,
            FindProcedureUseCase procedures,
            ResolvePatientUseCase patients,
            AppointmentRepository appointments,
            ScheduleReminderUseCase scheduleReminder,
            Clock clock) {
        return new BookAppointmentService(
                dentists, schedules, procedures, patients, appointments, scheduleReminder, clock);
    }

    @Bean
    public GetReminderAppointmentUseCase getReminderAppointmentUseCase(
            AppointmentRepository appointments,
            FindPatientUseCase patients,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            Clock clock) {
        return new GetReminderAppointmentService(
                appointments, patients, dentists, procedures, clock);
    }

    @Bean
    public AttachManageTokenUseCase attachManageTokenUseCase(AppointmentRepository appointments) {
        return new AttachManageTokenService(appointments);
    }

    @Bean
    public ManageAppointmentUseCase manageAppointmentUseCase(
            AppointmentRepository appointments,
            FindPatientUseCase patients,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            ListSchedulesUseCase schedules,
            ScheduleReminderUseCase scheduleReminder,
            CancelReminderUseCase cancelReminder,
            ManageTokenGenerator tokenGenerator,
            Clock clock) {
        return new ManageAppointmentService(
                appointments,
                patients,
                dentists,
                procedures,
                schedules,
                scheduleReminder,
                cancelReminder,
                tokenGenerator,
                clock);
    }

    @Bean
    public GetAgendaUseCase getAgendaUseCase(
            AppointmentRepository appointments,
            FindDentistUseCase dentists,
            FindProcedureUseCase procedures,
            FindPatientUseCase patients,
            GetReminderStatusUseCase reminderStatus) {
        return new GetAgendaService(appointments, dentists, procedures, patients, reminderStatus);
    }
}
