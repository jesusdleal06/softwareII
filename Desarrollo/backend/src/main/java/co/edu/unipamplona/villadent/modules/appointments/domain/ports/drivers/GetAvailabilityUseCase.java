package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface GetAvailabilityUseCase {

    AvailabilityResult get(AvailabilityQuery query);

    record AvailabilityQuery(Long dentistId, LocalDate date, Long procedureId) {
    }

    record AvailabilityResult(
            Long dentistId,
            LocalDate date,
            Long procedureId,
            List<LocalTime> slots) {
    }
}
