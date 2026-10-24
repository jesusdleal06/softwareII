package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.SetUserActiveUseCase;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/users")
public class UserController {

    private final RegisterUserUseCase registerUserUseCase;
    private final ListUsersUseCase listUsersUseCase;
    private final SetUserActiveUseCase setUserActiveUseCase;
    private final UserWebMapper mapper;

    public UserController(
            RegisterUserUseCase registerUserUseCase,
            ListUsersUseCase listUsersUseCase,
            SetUserActiveUseCase setUserActiveUseCase,
            UserWebMapper mapper) {
        this.registerUserUseCase = registerUserUseCase;
        this.listUsersUseCase = listUsersUseCase;
        this.setUserActiveUseCase = setUserActiveUseCase;
        this.mapper = mapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody RegisterUserRequest request) {
        return mapper.toUserResponse(registerUserUseCase.register(mapper.toCommand(request)));
    }

    @GetMapping
    public List<UserResponse> list() {
        return listUsersUseCase.list().stream().map(mapper::toUserResponse).toList();
    }

    @PatchMapping("/{id}/activar")
    public UserResponse activate(@PathVariable Long id) {
        return mapper.toUserResponse(setUserActiveUseCase.setActive(id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public UserResponse deactivate(@PathVariable Long id) {
        return mapper.toUserResponse(setUserActiveUseCase.setActive(id, false));
    }
}
