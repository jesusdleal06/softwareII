package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository {

    Optional<Appointment> findById(Long id);

    Optional<Appointment> findByTokenHash(String tokenHash);

    List<Appointment> findByDentistIdAndDate(Long dentistId, LocalDate date);

    List<Appointment> findByDate(LocalDate date);

    List<Appointment> findForReport(LocalDate from, LocalDate to, Long dentistId);

    long countActiveFrom(Long dentistId, LocalDate from);

    long countActiveByPatientFrom(Long patientId, LocalDate from);

    String nextCode();

    Appointment save(Appointment appointment);
}
