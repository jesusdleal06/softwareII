package co.edu.unipamplona.villadent.modules.patients.infrastructure.web;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.ListPatientsUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.RegisterPatientUseCase;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.SetPatientActiveUseCase;
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
@RequestMapping("/api/v1/patients")
public class PatientController {

    private final RegisterPatientUseCase registerPatientUseCase;
    private final ListPatientsUseCase listPatientsUseCase;
    private final SetPatientActiveUseCase setPatientActiveUseCase;
    private final PatientWebMapper mapper;

    public PatientController(
            RegisterPatientUseCase registerPatientUseCase,
            ListPatientsUseCase listPatientsUseCase,
            SetPatientActiveUseCase setPatientActiveUseCase,
            PatientWebMapper mapper) {
        this.registerPatientUseCase = registerPatientUseCase;
        this.listPatientsUseCase = listPatientsUseCase;
        this.setPatientActiveUseCase = setPatientActiveUseCase;
        this.mapper = mapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse create(@RequestBody RegisterPatientRequest request) {
        return mapper.toResponse(registerPatientUseCase.register(mapper.toCommand(request)));
    }

    @GetMapping
    public List<PatientResponse> list() {
        return listPatientsUseCase.list().stream().map(mapper::toResponse).toList();
    }

    @PatchMapping("/{id}/activar")
    public PatientResponse activate(@PathVariable Long id) {
        return mapper.toResponse(setPatientActiveUseCase.setActive(id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public PatientResponse deactivate(@PathVariable Long id) {
        return mapper.toResponse(setPatientActiveUseCase.setActive(id, false));
    }
}
