package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.ListStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.RegisterStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.SetStaffActiveUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.UpdateStaffUseCase;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin staff management. Only an auxiliar reaches these endpoints (see SecurityConfig). */
@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {

    private final ListStaffUseCase listStaff;
    private final RegisterStaffUseCase registerStaff;
    private final UpdateStaffUseCase updateStaff;
    private final SetStaffActiveUseCase setStaffActive;
    private final StaffWebMapper mapper;

    public StaffController(ListStaffUseCase listStaff, RegisterStaffUseCase registerStaff,
                           UpdateStaffUseCase updateStaff, SetStaffActiveUseCase setStaffActive,
                           StaffWebMapper mapper) {
        this.listStaff = listStaff;
        this.registerStaff = registerStaff;
        this.updateStaff = updateStaff;
        this.setStaffActive = setStaffActive;
        this.mapper = mapper;
    }

    @GetMapping
    public List<StaffResponse> list() {
        return listStaff.list().stream().map(mapper::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@Valid @RequestBody RegisterStaffRequest request) {
        return mapper.toResponse(registerStaff.register(mapper.toCommand(request)));
    }

    @PutMapping("/{id}")
    public StaffResponse update(@PathVariable Long id, @Valid @RequestBody UpdateStaffRequest request) {
        return mapper.toResponse(updateStaff.update(id, mapper.toCommand(request)));
    }

    @PatchMapping("/{id}/activar")
    public StaffResponse activate(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return mapper.toResponse(setStaffActive.setActive(actingUserId(jwt), id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public StaffResponse deactivate(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return mapper.toResponse(setStaffActive.setActive(actingUserId(jwt), id, false));
    }

    private static Long actingUserId(Jwt jwt) {
        Number userId = jwt.getClaim("userId");
        return userId == null ? null : userId.longValue();
    }
}
