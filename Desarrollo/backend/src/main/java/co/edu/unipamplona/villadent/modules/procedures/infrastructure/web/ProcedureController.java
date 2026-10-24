package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListProceduresUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.RegisterProcedureUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.SetProcedureActiveUseCase;
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
@RequestMapping("/api/v1/procedures")
public class ProcedureController {

    private final RegisterProcedureUseCase registerProcedureUseCase;
    private final ListProceduresUseCase listProceduresUseCase;
    private final SetProcedureActiveUseCase setProcedureActiveUseCase;
    private final ProcedureWebMapper mapper;

    public ProcedureController(
            RegisterProcedureUseCase registerProcedureUseCase,
            ListProceduresUseCase listProceduresUseCase,
            SetProcedureActiveUseCase setProcedureActiveUseCase,
            ProcedureWebMapper mapper) {
        this.registerProcedureUseCase = registerProcedureUseCase;
        this.listProceduresUseCase = listProceduresUseCase;
        this.setProcedureActiveUseCase = setProcedureActiveUseCase;
        this.mapper = mapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProcedureResponse create(@RequestBody RegisterProcedureRequest request) {
        return mapper.toResponse(registerProcedureUseCase.register(mapper.toCommand(request)));
    }

    @GetMapping
    public List<ProcedureResponse> list() {
        return listProceduresUseCase.list().stream().map(mapper::toResponse).toList();
    }

    @PatchMapping("/{id}/activar")
    public ProcedureResponse activate(@PathVariable Long id) {
        return mapper.toResponse(setProcedureActiveUseCase.setActive(id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public ProcedureResponse deactivate(@PathVariable Long id) {
        return mapper.toResponse(setProcedureActiveUseCase.setActive(id, false));
    }
}
