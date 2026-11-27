package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens;

import java.util.Optional;

public interface ReportPeople {
    Optional<String> dentistName(long id);
    Optional<String> staffName(long id);
}
