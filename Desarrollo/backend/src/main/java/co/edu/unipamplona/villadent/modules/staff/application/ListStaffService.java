package co.edu.unipamplona.villadent.modules.staff.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.ListStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.StaffSummary;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

public class ListStaffService implements ListStaffUseCase {

    private final ListUsersUseCase listUsers;
    private final ListDentistsUseCase listDentists;

    public ListStaffService(ListUsersUseCase listUsers, ListDentistsUseCase listDentists) {
        this.listUsers = listUsers;
        this.listDentists = listDentists;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffSummary> list() {
        Map<Long, DentistResult> dentistsByUser = listDentists.list().stream()
                .filter(dentist -> dentist.userId() != null)
                .collect(Collectors.toMap(DentistResult::userId, Function.identity(), (first, second) -> first));
        return listUsers.list().stream()
                .map(user -> {
                    DentistResult dentist = user.role() == Role.ODONTOLOGO ? dentistsByUser.get(user.id()) : null;
                    return new StaffSummary(user.id(), user.name(), user.email(), user.role(), user.active(),
                            dentist == null ? null : dentist.id(),
                            dentist == null ? null : dentist.specialty());
                })
                .toList();
    }
}
