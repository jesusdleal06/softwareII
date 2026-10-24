package co.edu.unipamplona.villadent.modules.users.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.users.domain.model.User;

public interface TokenGenerator {

    IssuedToken issue(User user);
}
