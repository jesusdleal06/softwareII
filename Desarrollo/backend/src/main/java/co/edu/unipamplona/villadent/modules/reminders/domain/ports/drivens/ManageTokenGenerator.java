package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens;

public interface ManageTokenGenerator {

    String generate();

    String hash(String rawToken);
}
