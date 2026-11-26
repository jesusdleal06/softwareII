package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.GetOwnDentistProfileUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ReplaceOwnDentistPhotoUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateOwnDentistProfileUseCase;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/dentists/me")
public class DentistProfileController {
    private final GetOwnDentistProfileUseCase getProfile;
    private final UpdateOwnDentistProfileUseCase updateProfile;
    private final ReplaceOwnDentistPhotoUseCase replacePhoto;
    private final DentistWebMapper mapper;

    public DentistProfileController(GetOwnDentistProfileUseCase getProfile,
                                    UpdateOwnDentistProfileUseCase updateProfile,
                                    ReplaceOwnDentistPhotoUseCase replacePhoto, DentistWebMapper mapper) {
        this.getProfile = getProfile;
        this.updateProfile = updateProfile;
        this.replacePhoto = replacePhoto;
        this.mapper = mapper;
    }

    @GetMapping("/profile")
    public DentistProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return mapper.toProfileResponse(getProfile.get(userId(jwt)));
    }

    @PutMapping("/profile")
    public DentistProfileResponse update(@AuthenticationPrincipal Jwt jwt,
                                          @RequestBody UpdateDentistProfileRequest request) {
        return mapper.toProfileResponse(updateProfile.update(userId(jwt), mapper.toCommand(request)));
    }

    @PutMapping(path = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DentistProfileResponse upload(@AuthenticationPrincipal Jwt jwt,
                                          @RequestPart("photo") MultipartFile photo) throws IOException {
        return mapper.toProfileResponse(replacePhoto.replace(userId(jwt), photo.getBytes()));
    }

    private static long userId(Jwt jwt) {
        return ((Number) jwt.getClaim("userId")).longValue();
    }
}
