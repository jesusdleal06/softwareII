package co.edu.unipamplona.villadent.archfixture.modules.sample.application;

import co.edu.unipamplona.villadent.archfixture.modules.sample.domain.SampleEntity;
import org.springframework.transaction.annotation.Transactional;

/** Test-only fixture: depends on the domain and the transaction annotation, both allowed. */
public class AllowedUseCase {

    @Transactional
    public SampleEntity execute() {
        return new SampleEntity();
    }
}
