package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final LoginUseCase loginUseCase;
    private final UserWebMapper mapper;

    public AuthController(LoginUseCase loginUseCase, UserWebMapper mapper) {
        this.loginUseCase = loginUseCase;
        this.mapper = mapper;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return mapper.toLoginResponse(loginUseCase.login(mapper.toCommand(request)));
    }
}
