package co.edu.unipamplona.villadent.modules.reminders.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SecureManageTokenAdapterTest {

    @Test
    void generatesUrlSafeTokensAndStableHashes() {
        SecureManageTokenAdapter adapter = new SecureManageTokenAdapter();

        String first = adapter.generate();
        String second = adapter.generate();

        assertThat(first).hasSize(43).isNotEqualTo(second).doesNotContain("+", "/", "=");
        assertThat(adapter.hash(first)).hasSize(64).isEqualTo(adapter.hash(first));
        assertThat(adapter.hash(first)).isNotEqualTo(adapter.hash(second));
    }
}
