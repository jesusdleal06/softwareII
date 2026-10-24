package co.edu.unipamplona.villadent.modules.users.infrastructure.config;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);
    private static final int MINIMUM_PASSWORD_LENGTH = 12;

    private final BootstrapAdminSettings settings;
    private final UserRepository users;
    private final PasswordHasher passwordHasher;

    public BootstrapAdminRunner(
            BootstrapAdminSettings settings,
            UserRepository users,
            PasswordHasher passwordHasher) {
        this.settings = settings;
        this.users = users;
        this.passwordHasher = passwordHasher;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!settings.enabled()) {
            log.info("Bootstrap admin disabled; no account was created.");
            return;
        }
        if (isBlank(settings.email()) || isBlank(settings.password())) {
            log.warn("Bootstrap admin skipped: BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.");
            return;
        }
        if (settings.password().length() < MINIMUM_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "BOOTSTRAP_ADMIN_PASSWORD must have at least " + MINIMUM_PASSWORD_LENGTH + " characters.");
        }
        if (users.existsActiveByRole(Role.AUXILIAR)) {
            log.info("Bootstrap admin skipped: an active AUXILIAR account already exists.");
            return;
        }
        if (users.findByEmail(settings.email()).isPresent()) {
            log.warn("Bootstrap admin skipped: a user with that email already exists; its password was not changed.");
            return;
        }
        User admin = User.create(
                settings.name(),
                settings.email(),
                passwordHasher.hash(settings.password()),
                Role.AUXILIAR);
        users.save(admin);
        log.info("Bootstrap admin created for {}.", admin.email());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
