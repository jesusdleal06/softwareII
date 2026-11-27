package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.util.List;

public interface UpdateOwnDentistProfileUseCase {
    DentistResult update(Long userId, ProfileUpdate update);

    record ProfileUpdate(String firstName, String secondName, String firstSurname, String secondSurname,
                         List<String> academicTitles, String description) {}
}
