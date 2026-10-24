package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase.AvailabilityQuery;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAvailabilityUseCase.AvailabilityResult;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/availability")
public class PublicAvailabilityController {

    private static final DateTimeFormatter SLOT_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final GetAvailabilityUseCase getAvailabilityUseCase;

    public PublicAvailabilityController(GetAvailabilityUseCase getAvailabilityUseCase) {
        this.getAvailabilityUseCase = getAvailabilityUseCase;
    }

    @GetMapping
    public AvailabilityResponse availability(
            @RequestParam Long dentistId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Long procedureId) {
        AvailabilityResult result = getAvailabilityUseCase.get(
                new AvailabilityQuery(dentistId, date, procedureId));
        return new AvailabilityResponse(
                result.dentistId(),
                result.date(),
                result.procedureId(),
                result.slots().stream().map(SLOT_FORMAT::format).toList());
    }
}
