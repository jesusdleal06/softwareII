package co.edu.unipamplona.villadent;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.archfixture.modules.sample.application.AllowedUseCase;
import co.edu.unipamplona.villadent.archfixture.modules.sample.application.ForbiddenUseCase;
import co.edu.unipamplona.villadent.archfixture.modules.sample.domain.FrameworkDependentEntity;
import co.edu.unipamplona.villadent.archfixture.modules.sample.domain.SampleEntity;
import co.edu.unipamplona.villadent.archfixture.modules.sample.domain.ports.drivens.AllowedDrivenPort;
import co.edu.unipamplona.villadent.archfixture.modules.sample.domain.ports.drivens.ForbiddenDrivenPort;
import co.edu.unipamplona.villadent.archfixture.modules.sample.infrastructure.SampleAdapter;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Checks the architecture rules themselves against small test-only fixtures.
 * The production code has no `modules` package yet, so ArchitectureTest alone
 * would pass even with a wrong rule.
 */
class ArchitectureRulesTest {

    @Test
    @DisplayName("The application layer may depend on the domain and the transaction annotation")
    void applicationMayDependOnDomain() {
        JavaClasses classes = new ClassFileImporter().importClasses(AllowedUseCase.class, SampleEntity.class);

        assertThatCode(() -> ArchitectureTest.applicationDependsOnlyOnDomain.check(classes))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("The application layer must not depend on infrastructure")
    void applicationMustNotDependOnInfrastructure() {
        JavaClasses classes = new ClassFileImporter().importClasses(ForbiddenUseCase.class, SampleAdapter.class);

        assertThatThrownBy(() -> ArchitectureTest.applicationDependsOnlyOnDomain.check(classes))
            .isInstanceOf(AssertionError.class)
            .hasMessageContaining("SampleAdapter");
    }

    @Test
    @DisplayName("The domain layer may not depend on a framework")
    void domainMustNotDependOnFrameworks() {
        JavaClasses classes = new ClassFileImporter().importClasses(FrameworkDependentEntity.class, SampleEntity.class);

        assertThatThrownBy(() -> ArchitectureTest.domainHasNoFrameworkDependencies.check(classes))
            .isInstanceOf(AssertionError.class)
            .hasMessageContaining("FrameworkDependentEntity");
    }

    @Test
    @DisplayName("The domain layer may stay framework-free")
    void domainMayStayFrameworkFree() {
        JavaClasses classes = new ClassFileImporter().importClasses(SampleEntity.class);

        assertThatCode(() -> ArchitectureTest.domainHasNoFrameworkDependencies.check(classes))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("A driven port must not declare a delete method")
    void drivenPortMustNotDeclareDeleteMethods() {
        JavaClasses classes = new ClassFileImporter().importClasses(ForbiddenDrivenPort.class, AllowedDrivenPort.class);

        assertThatThrownBy(() -> ArchitectureTest.drivenPortsAreAppendOnly.check(classes))
            .isInstanceOf(AssertionError.class)
            .hasMessageContaining("delete");
    }

    @Test
    @DisplayName("A driven port may add and read records")
    void drivenPortMayAddAndReadRecords() {
        JavaClasses classes = new ClassFileImporter().importClasses(AllowedDrivenPort.class);

        assertThatCode(() -> ArchitectureTest.drivenPortsAreAppendOnly.check(classes))
            .doesNotThrowAnyException();
    }
}
