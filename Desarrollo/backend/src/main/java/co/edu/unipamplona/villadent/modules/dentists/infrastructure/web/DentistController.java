package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetScheduleActiveUseCase;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dentists")
public class DentistController {

    private final RegisterDentistUseCase registerDentistUseCase;
    private final ListDentistsUseCase listDentistsUseCase;
    private final SetDentistActiveUseCase setDentistActiveUseCase;
    private final AddScheduleUseCase addScheduleUseCase;
    private final ListSchedulesUseCase listSchedulesUseCase;
    private final SetScheduleActiveUseCase setScheduleActiveUseCase;
    private final DentistWebMapper mapper;

    public DentistController(
            RegisterDentistUseCase registerDentistUseCase,
            ListDentistsUseCase listDentistsUseCase,
            SetDentistActiveUseCase setDentistActiveUseCase,
            AddScheduleUseCase addScheduleUseCase,
            ListSchedulesUseCase listSchedulesUseCase,
            SetScheduleActiveUseCase setScheduleActiveUseCase,
            DentistWebMapper mapper) {
        this.registerDentistUseCase = registerDentistUseCase;
        this.listDentistsUseCase = listDentistsUseCase;
        this.setDentistActiveUseCase = setDentistActiveUseCase;
        this.addScheduleUseCase = addScheduleUseCase;
        this.listSchedulesUseCase = listSchedulesUseCase;
        this.setScheduleActiveUseCase = setScheduleActiveUseCase;
        this.mapper = mapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DentistResponse create(@RequestBody RegisterDentistRequest request) {
        return mapper.toResponse(registerDentistUseCase.register(mapper.toCommand(request)));
    }

    @GetMapping
    public List<DentistResponse> list() {
        return listDentistsUseCase.list().stream().map(mapper::toResponse).toList();
    }

    @PatchMapping("/{id}/activar")
    public DentistResponse activate(@PathVariable Long id) {
        return mapper.toResponse(setDentistActiveUseCase.setActive(id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public DentistResponse deactivate(@PathVariable Long id) {
        return mapper.toResponse(setDentistActiveUseCase.setActive(id, false));
    }

    @PostMapping("/{dentistId}/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse addSchedule(
            @PathVariable Long dentistId,
            @RequestBody RegisterScheduleRequest request) {
        return mapper.toResponse(addScheduleUseCase.add(mapper.toCommand(dentistId, request)));
    }

    @GetMapping("/{dentistId}/schedules")
    public List<ScheduleResponse> listSchedules(@PathVariable Long dentistId) {
        return listSchedulesUseCase.listByDentist(dentistId).stream().map(mapper::toResponse).toList();
    }

    @PatchMapping("/{dentistId}/schedules/{scheduleId}/activar")
    public ScheduleResponse activateSchedule(
            @PathVariable Long dentistId,
            @PathVariable Long scheduleId) {
        return mapper.toResponse(setScheduleActiveUseCase.setActive(dentistId, scheduleId, true));
    }

    @PatchMapping("/{dentistId}/schedules/{scheduleId}/desactivar")
    public ScheduleResponse deactivateSchedule(
            @PathVariable Long dentistId,
            @PathVariable Long scheduleId) {
        return mapper.toResponse(setScheduleActiveUseCase.setActive(dentistId, scheduleId, false));
    }
}
