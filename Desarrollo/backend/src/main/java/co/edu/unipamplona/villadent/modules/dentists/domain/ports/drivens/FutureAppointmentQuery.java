package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens;

import java.time.LocalDate;

/** Implemented by the appointments module; keeps the deactivation rule out of dentists. */
public interface FutureAppointmentQuery {

    long countActiveFrom(Long dentistId, LocalDate from);
}
