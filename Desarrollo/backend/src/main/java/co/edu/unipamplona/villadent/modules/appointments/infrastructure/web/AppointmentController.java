package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAgendaUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistByUserIdUseCase;
import co.edu.unipamplona.villadent.shared.error.ForbiddenException;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/appointments")
public class AppointmentController {

    private final BookAppointmentUseCase bookAppointmentUseCase;
    private final GetAgendaUseCase getAgendaUseCase;
    private final FindDentistByUserIdUseCase findDentistByUserIdUseCase;
    private final AppointmentWebMapper mapper;

    public AppointmentController(
            BookAppointmentUseCase bookAppointmentUseCase,
            GetAgendaUseCase getAgendaUseCase,
            FindDentistByUserIdUseCase findDentistByUserIdUseCase,
            AppointmentWebMapper mapper) {
        this.bookAppointmentUseCase = bookAppointmentUseCase;
        this.getAgendaUseCase = getAgendaUseCase;
        this.findDentistByUserIdUseCase = findDentistByUserIdUseCase;
        this.mapper = mapper;
    }

    @GetMapping
    public List<StaffAppointmentResponse> agenda(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long dentistId,
            @AuthenticationPrincipal Jwt jwt) {
        return getAgendaUseCase.agenda(date, ownDentistId(jwt, dentistId)).stream()
                .map(mapper::toStaffResponse)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffAppointmentResponse book(@Valid @RequestBody BookAppointmentRequest request) {
        return mapper.toStaffResponse(
                bookAppointmentUseCase.book(mapper.toCommand(request, AppointmentOrigin.MANUAL)));
    }

    private Long ownDentistId(Jwt jwt, Long requestedDentistId) {
        if (!"ODONTOLOGO".equals(jwt.getClaimAsString("role"))) {
            return requestedDentistId;
        }
        Long userId = ((Number) jwt.getClaim("userId")).longValue();
        DentistResult own = findDentistByUserIdUseCase.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        if (requestedDentistId != null && !requestedDentistId.equals(own.id())) {
            throw new ForbiddenException("No puedes consultar la agenda de otro odontólogo.");
        }
        return own.id();
    }
}
