package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers.ListActiveProceduresUseCase;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public catalog: only active procedures. */
@RestController
@RequestMapping("/api/v1/public/procedures")
public class PublicProcedureController {

    private final ListActiveProceduresUseCase listActiveProceduresUseCase;
    private final ProcedureWebMapper mapper;

    public PublicProcedureController(
            ListActiveProceduresUseCase listActiveProceduresUseCase,
            ProcedureWebMapper mapper) {
        this.listActiveProceduresUseCase = listActiveProceduresUseCase;
        this.mapper = mapper;
    }

    @GetMapping
    public List<PublicProcedureResponse> list() {
        return listActiveProceduresUseCase.listActive().stream()
                .map(mapper::toPublicResponse)
                .toList();
    }
}
