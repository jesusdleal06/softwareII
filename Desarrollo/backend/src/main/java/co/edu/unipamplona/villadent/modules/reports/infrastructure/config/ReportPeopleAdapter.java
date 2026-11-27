package co.edu.unipamplona.villadent.modules.reports.infrastructure.config;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPeople;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class ReportPeopleAdapter implements ReportPeople {
    private final FindDentistUseCase dentists;
    private final FindUserUseCase users;

    public ReportPeopleAdapter(FindDentistUseCase dentists, FindUserUseCase users) {
        this.dentists = dentists;
        this.users = users;
    }

    @Override
    public Optional<String> dentistName(long id) {
        return dentists.findById(id).map(DentistResult::name);
    }

    @Override
    public Optional<String> staffName(long id) {
        return users.findById(id).map(UserSummary::name);
    }
}
