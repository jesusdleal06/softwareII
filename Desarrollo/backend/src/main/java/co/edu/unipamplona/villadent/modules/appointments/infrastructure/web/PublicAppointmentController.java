package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/appointments")
public class PublicAppointmentController {

    private final BookAppointmentUseCase bookAppointmentUseCase;
    private final AppointmentWebMapper mapper;

    public PublicAppointmentController(
            BookAppointmentUseCase bookAppointmentUseCase,
            AppointmentWebMapper mapper) {
        this.bookAppointmentUseCase = bookAppointmentUseCase;
        this.mapper = mapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PublicAppointmentResponse book(@Valid @RequestBody BookAppointmentRequest request) {
        return mapper.toPublicResponse(
                bookAppointmentUseCase.book(mapper.toCommand(request, AppointmentOrigin.WEB)));
    }
}
