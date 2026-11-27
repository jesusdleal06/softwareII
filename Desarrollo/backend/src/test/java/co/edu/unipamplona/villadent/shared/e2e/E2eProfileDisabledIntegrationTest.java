package co.edu.unipamplona.villadent.shared.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import co.edu.unipamplona.villadent.modules.reminders.infrastructure.whatsapp.WhatsAppReminderSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "app.bootstrap-admin.enabled=false",
        "app.reminders.scheduler.enabled=false"
})
@AutoConfigureMockMvc
class E2eProfileDisabledIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ReminderSender sender;

    @Test
    void routeIsProtectedAndHasNoHandler() throws Exception {
        String path = "/api/v1/e2e/appointments/1/manage-link";
        mockMvc.perform(post(path)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(path).with(SecurityMockMvcRequestPostProcessors.jwt()))
                .andExpect(status().isNotFound());
    }

    @Test
    void realSenderRemainsActive() {
        assertThat(sender).isInstanceOf(WhatsAppReminderSender.class);
    }
}
