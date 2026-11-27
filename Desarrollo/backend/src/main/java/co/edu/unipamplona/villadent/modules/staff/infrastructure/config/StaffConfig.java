package co.edu.unipamplona.villadent.modules.staff.infrastructure.config;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistByUserIdUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateDentistIdentityUseCase;
import co.edu.unipamplona.villadent.modules.staff.application.ListStaffService;
import co.edu.unipamplona.villadent.modules.staff.application.RegisterStaffService;
import co.edu.unipamplona.villadent.modules.staff.application.SetStaffActiveService;
import co.edu.unipamplona.villadent.modules.staff.application.UpdateStaffService;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.ListStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.RegisterStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.SetStaffActiveUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.UpdateStaffUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.SetUserActiveUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UpdateUserIdentityUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StaffConfig {

    @Bean
    public ListStaffUseCase listStaffUseCase(ListUsersUseCase listUsers, ListDentistsUseCase listDentists) {
        return new ListStaffService(listUsers, listDentists);
    }

    @Bean
    public RegisterStaffUseCase registerStaffUseCase(
            RegisterUserUseCase registerUser,
            RegisterDentistUseCase registerDentist) {
        return new RegisterStaffService(registerUser, registerDentist);
    }

    @Bean
    public UpdateStaffUseCase updateStaffUseCase(
            FindUserUseCase findUser,
            UpdateUserIdentityUseCase updateUser,
            FindDentistByUserIdUseCase findDentist,
            UpdateDentistIdentityUseCase updateDentist) {
        return new UpdateStaffService(findUser, updateUser, findDentist, updateDentist);
    }

    @Bean
    public SetStaffActiveUseCase setStaffActiveUseCase(
            FindUserUseCase findUser,
            SetUserActiveUseCase setUserActive,
            FindDentistByUserIdUseCase findDentist,
            SetDentistActiveUseCase setDentistActive) {
        return new SetStaffActiveService(findUser, setUserActive, findDentist, setDentistActive);
    }
}
