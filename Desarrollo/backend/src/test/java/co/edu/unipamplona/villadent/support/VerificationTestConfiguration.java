package co.edu.unipamplona.villadent.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class VerificationTestConfiguration {

    @Bean
    @Primary
    public CapturingVerificationSender capturingVerificationSender() {
        return new CapturingVerificationSender();
    }
}
