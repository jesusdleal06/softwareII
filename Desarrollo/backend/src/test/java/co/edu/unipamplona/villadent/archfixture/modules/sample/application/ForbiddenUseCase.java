package co.edu.unipamplona.villadent.archfixture.modules.sample.application;

import co.edu.unipamplona.villadent.archfixture.modules.sample.infrastructure.SampleAdapter;

/** Test-only fixture: depends on infrastructure, which the application layer must not do. */
public class ForbiddenUseCase {

    public SampleAdapter execute() {
        return new SampleAdapter();
    }
}
