package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.shared.error.DentistPhotoTooLargeException;
import co.edu.unipamplona.villadent.modules.dentists.domain.error.DentistPhotoUploadException;
import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidDentistDataException;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.GetOwnDentistProfileUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ReplaceOwnDentistPhotoUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateOwnDentistProfileUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ImageStorage;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class DentistProfileService implements GetOwnDentistProfileUseCase, UpdateOwnDentistProfileUseCase,
        ReplaceOwnDentistPhotoUseCase {
    private static final int MAX_PHOTO_BYTES = 5 * 1024 * 1024;

    private final DentistRepository dentists;
    private final ImageStorage images;

    public DentistProfileService(DentistRepository dentists, ImageStorage images) {
        this.dentists = dentists;
        this.images = images;
    }

    @Override
    @Transactional(readOnly = true)
    public DentistResult get(Long userId) {
        return RegisterDentistService.toResult(ownDentist(userId));
    }

    @Override
    @Transactional
    public DentistResult update(Long userId, ProfileUpdate update) {
        Dentist dentist = ownDentist(userId).updateProfile(update.firstName(), update.secondName(),
                update.firstSurname(), update.secondSurname(), update.academicTitles(), update.description());
        return RegisterDentistService.toResult(dentists.save(dentist));
    }

    @Override
    @Transactional
    public DentistResult replace(Long userId, byte[] photo) {
        Dentist dentist = ownDentist(userId);
        if (photo.length > MAX_PHOTO_BYTES) {
            throw new DentistPhotoTooLargeException();
        }
        String contentType = detectContentType(photo);
        ImageStorage.StoredImage image;
        try {
            image = images.upload(photo, contentType);
        } catch (RuntimeException exception) {
            throw new DentistPhotoUploadException(exception);
        }
        return RegisterDentistService.toResult(dentists.save(dentist.replacePhoto(image.url(), image.publicId())));
    }

    private Dentist ownDentist(Long userId) {
        return dentists.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
    }

    private static String detectContentType(byte[] photo) {
        if (matches(photo, 0, 0xff, 0xd8, 0xff)) {
            return "image/jpeg";
        }
        if (matches(photo, 0, 0x89, 'P', 'N', 'G')) {
            return "image/png";
        }
        if (matches(photo, 0, 'R', 'I', 'F', 'F') && matches(photo, 8, 'W', 'E', 'B', 'P')) {
            return "image/webp";
        }
        throw new InvalidDentistDataException("La imagen debe ser JPG, PNG o WebP.");
    }

    private static boolean matches(byte[] bytes, int offset, int... expected) {
        if (bytes.length < offset + expected.length) {
            return false;
        }
        for (int index = 0; index < expected.length; index++) {
            if (Byte.toUnsignedInt(bytes[offset + index]) != expected[index]) {
                return false;
            }
        }
        return true;
    }
}
