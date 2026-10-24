package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.FutureAppointmentQuery;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.transaction.annotation.Transactional;

public class SetDentistActiveService implements SetDentistActiveUseCase {

    private final DentistRepository dentists;
    private final FutureAppointmentQuery futureAppointments;
    private final Clock clock;

    public SetDentistActiveService(
            DentistRepository dentists,
            FutureAppointmentQuery futureAppointments,
            Clock clock) {
        this.dentists = dentists;
        this.futureAppointments = futureAppointments;
        this.clock = clock;
    }

    @Override
    @Transactional
    public DentistResult setActive(Long id, boolean active) {
        Dentist dentist = dentists.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        if (!active) {
            long future = futureAppointments.countActiveFrom(id, LocalDate.now(clock));
            if (future > 0) {
                throw new ConflictException(
                        "DENTIST_HAS_FUTURE_APPOINTMENTS",
                        "El odontólogo tiene citas futuras activas (" + future
                                + "). Reprograma o cancela antes de desactivarlo.");
            }
        }
        return RegisterDentistService.toResult(dentists.save(dentist.changeActive(active)));
    }
}
