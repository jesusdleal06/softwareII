package co.edu.unipamplona.villadent;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvent;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;

@AnalyzeClasses(packages = "co.edu.unipamplona.villadent")
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainHasNoFrameworkDependencies = noClasses()
        .that()
        .resideInAPackage("co.edu.unipamplona.villadent..modules..domain..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(
            "org.springframework..",
            "jakarta..",
            "co.edu.unipamplona.villadent..modules..application..",
            "co.edu.unipamplona.villadent..modules..infrastructure..")
        .because("the domain layer must stay free of frameworks and of the other layers")
        .allowEmptyShould(true);

    @ArchTest
    static final ArchRule applicationDependsOnlyOnDomain = noClasses()
        .that()
        .resideInAPackage("co.edu.unipamplona.villadent..modules..application..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(
            "co.edu.unipamplona.villadent..modules..domain..",
            "org.springframework.transaction.annotation..")
        .because("the application layer may only depend on the domain and the transaction annotation")
        .allowEmptyShould(true);

    @ArchTest
    static final ArchRule drivenPortsAreAppendOnly = noClasses()
        .that()
        .resideInAPackage("co.edu.unipamplona.villadent..modules..domain..ports..drivens..")
        .should(noDeleteMethods())
        .because("nothing is physically deleted: driven ports must stay append-only")
        .allowEmptyShould(true);

    private static ArchCondition<JavaClass> noDeleteMethods() {
        return new ArchCondition<JavaClass>("driven ports must not declare delete methods") {
            @Override
            public void check(JavaClass clazz, ConditionEvents events) {
                boolean hasDeleteMethod = clazz.getMethods().stream()
                    .anyMatch(method -> method.getName().startsWith("delete"));
                if (hasDeleteMethod) {
                    events.add(new ConditionEvent() {
                        @Override
                        public boolean isViolation() {
                            return true;
                        }

                        @Override
                        public ConditionEvent invert() {
                            return this;
                        }

                        @Override
                        public List<String> getDescriptionLines() {
                            return List.of("driven port declares a delete method");
                        }

                        @Override
                        public void handleWith(ConditionEvent.Handler handler) {
                            handler.handle(List.of(), "delete method declared");
                        }
                    });
                }
            }
        };
    }
}
