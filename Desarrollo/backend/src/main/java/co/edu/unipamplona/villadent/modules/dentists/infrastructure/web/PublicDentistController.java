package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListActiveDentistsUseCase;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public catalog: only active dentists, never their linked staff user. */
@RestController
@RequestMapping("/api/v1/public/dentists")
public class PublicDentistController {

    private final ListActiveDentistsUseCase listActiveDentistsUseCase;
    private final DentistWebMapper mapper;

    public PublicDentistController(
            ListActiveDentistsUseCase listActiveDentistsUseCase,
            DentistWebMapper mapper) {
        this.listActiveDentistsUseCase = listActiveDentistsUseCase;
        this.mapper = mapper;
    }

    @GetMapping
    public List<PublicDentistResponse> list() {
        return listActiveDentistsUseCase.listActive().stream()
                .map(mapper::toPublicResponse)
                .toList();
    }
}
