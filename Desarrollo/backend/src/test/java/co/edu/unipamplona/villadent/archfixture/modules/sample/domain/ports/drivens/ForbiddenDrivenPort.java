package co.edu.unipamplona.villadent.archfixture.modules.sample.domain.ports.drivens;

/** Test-only fixture: a driven port that declares a delete method, which is forbidden. */
public interface ForbiddenDrivenPort {

    void deleteSample(Long id);
}
