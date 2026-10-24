package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ManageAppointmentUseCase;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/appointments/manage")
public class ManagedAppointmentController {

    private final ManageAppointmentUseCase manageAppointment;

    public ManagedAppointmentController(ManageAppointmentUseCase manageAppointment) {
        this.manageAppointment = manageAppointment;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ManagedAppointmentResponse> view(@PathVariable String token) {
        return ResponseEntity.ok(ManagedAppointmentResponse.from(manageAppointment.view(token)));
    }

    @PostMapping("/{token}/confirm")
    public ResponseEntity<ManagedAppointmentResponse> confirm(@PathVariable String token) {
        return ResponseEntity.ok(ManagedAppointmentResponse.from(manageAppointment.confirm(token)));
    }

    @PostMapping("/{token}/cancel")
    public ResponseEntity<ManagedAppointmentResponse> cancel(@PathVariable String token) {
        return ResponseEntity.ok(ManagedAppointmentResponse.from(manageAppointment.cancel(token)));
    }

    @PostMapping("/{token}/reschedule")
    public ResponseEntity<ManagedAppointmentResponse> reschedule(
            @PathVariable String token,
            @Valid @RequestBody RescheduleAppointmentRequest request) {
        return ResponseEntity.ok(ManagedAppointmentResponse.from(
                manageAppointment.reschedule(token, request.date(), request.time())));
    }
}
