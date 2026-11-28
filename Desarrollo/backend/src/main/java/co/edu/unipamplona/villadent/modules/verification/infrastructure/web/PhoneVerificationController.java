package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.RequestVerificationCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/phone-verifications")
public class PhoneVerificationController {

    private final RequestVerificationCodeUseCase requestCodeUseCase;
    private final VerifyPhoneCodeUseCase verifyCodeUseCase;
    private final VerificationWebMapper mapper;
    private final ClientIpResolver clientIpResolver;

    public PhoneVerificationController(
            RequestVerificationCodeUseCase requestCodeUseCase,
            VerifyPhoneCodeUseCase verifyCodeUseCase,
            VerificationWebMapper mapper,
            ClientIpResolver clientIpResolver) {
        this.requestCodeUseCase = requestCodeUseCase;
        this.verifyCodeUseCase = verifyCodeUseCase;
        this.mapper = mapper;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestCode(
            @RequestBody RequestCodeRequest request,
            HttpServletRequest httpRequest) {
        requestCodeUseCase.request(mapper.toCommand(request, clientIpResolver.resolve(httpRequest)));
    }

    @PostMapping("/verify")
    public VerifyCodeResponse verifyCode(@RequestBody VerifyCodeRequest request) {
        return mapper.toResponse(verifyCodeUseCase.verify(mapper.toCommand(request)));
    }
}
