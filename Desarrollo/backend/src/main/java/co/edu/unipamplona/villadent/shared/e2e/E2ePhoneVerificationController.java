package co.edu.unipamplona.villadent.shared.e2e;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("e2e")
public class E2ePhoneVerificationController {

    public static final String PATH = "/api/v1/e2e/phone-verifications/{phone}/code";

    private final InMemoryVerificationSender sender;
    private final NormalizePhoneUseCase normalizePhone;

    public E2ePhoneVerificationController(
            InMemoryVerificationSender sender,
            NormalizePhoneUseCase normalizePhone) {
        this.sender = sender;
        this.normalizePhone = normalizePhone;
    }

    @GetMapping(PATH)
    public ResponseEntity<E2eVerificationCodeResponse> code(@PathVariable String phone) {
        String normalizedPhone = normalizePhone.normalize(phone);
        String code = sender.codeFor(normalizedPhone)
                .orElseThrow(() -> new NotFoundException("No se encontró el código."));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new E2eVerificationCodeResponse(code));
    }
}
