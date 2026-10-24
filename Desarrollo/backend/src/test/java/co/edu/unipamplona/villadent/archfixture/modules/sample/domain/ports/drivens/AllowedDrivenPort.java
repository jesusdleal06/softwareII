package co.edu.unipamplona.villadent.archfixture.modules.sample.domain.ports.drivens;

/** Test-only fixture: a driven port that only adds and reads, which is allowed. */
public interface AllowedDrivenPort {

    void save(String value);

    String findById(Long id);
}
