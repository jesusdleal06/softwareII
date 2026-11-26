package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ImageStorage;
import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Import({TestcontainersConfiguration.class, DentistProfileIntegrationTest.FakeStorage.class})
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class DentistProfileIntegrationTest {
    static final String PROFILE = "/api/v1/dentists/me/profile";
    static final String PHOTO = "/api/v1/dentists/me/photo";
    static final String PUBLIC = "/api/v1/public/dentists";
    static final String UPDATE = """
            {"firstName":"Laura","secondName":"María","firstSurname":"Peña","secondSurname":"Ortiz",
             "academicTitles":["Dentistry"],"description":"Sample profile"}
            """;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired PostgreSQLContainer postgres;
    long userId;
    long dentistId;

    @TestConfiguration(proxyBeanMethods = false)
    static class FakeStorage {
        @Bean
        @Primary
        ImageStorage fakeImageStorage() {
            return (bytes, contentType) -> {
                if (bytes.length == 4 && bytes[3] == 42) {
                    throw new IllegalStateException("Simulated upload failure");
                }
                assertThat(contentType).isEqualTo("image/jpeg");
                return new ImageStorage.StoredImage("https://example.test/photo", "profile-photo");
            };
        }
    }

    @BeforeEach
    void seed() {
        userId = db.queryForObject("""
                INSERT INTO usuarios (nombre, correo, password_hash, id_rol)
                SELECT 'Profile test', ?, 'unused', id_rol FROM roles WHERE nombre_rol='ODONTOLOGO'
                RETURNING id_usuario
                """, Long.class, UUID.randomUUID() + "@example.test");
        dentistId = db.queryForObject("""
                INSERT INTO odontologos (nombre,id_usuario) VALUES ('Original Name',?)
                RETURNING id_odontologo
                """, Long.class, userId);
    }

    RequestPostProcessor as(String role) {
        return jwt().jwt(token -> token.claim("userId", userId).claim("role", role))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Test
    @DisplayName("CP-RF11-01: updates and reloads the authenticated dentist profile")
    void updatesAndReloads() throws Exception {
        update()
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(dentistId))
                .andExpect(jsonPath("$.fullName").value("Laura María Peña Ortiz"));
        mvc.perform(get(PROFILE).with(as("ODONTOLOGO"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Laura")).andExpect(jsonPath("$.secondName").value("María"))
                .andExpect(jsonPath("$.firstSurname").value("Peña")).andExpect(jsonPath("$.secondSurname").value("Ortiz"))
                .andExpect(jsonPath("$.academicTitles", contains("Dentistry")))
                .andExpect(jsonPath("$.description").value("Sample profile"));
        assertThat(db.queryForObject("SELECT nombre FROM odontologos WHERE id_odontologo=?", String.class, dentistId))
                .isEqualTo("Laura María Peña Ortiz");
    }

    @Test
    @DisplayName("CP-RF11-08: only dentists can use profile endpoints")
    void roles() throws Exception {
        for (var request : List.of(get(PROFILE), put(PROFILE), put(PHOTO))) {
            mvc.perform(request).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.detail").value("Debes iniciar sesión para continuar."));
            mvc.perform(request.with(as("AUXILIAR"))).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.detail").value("No tienes permisos para realizar esta acción."));
        }
        assertThat(db.queryForMap("SELECT nombre, foto_url FROM odontologos WHERE id_odontologo=?", dentistId))
                .containsEntry("nombre", "Original Name").containsEntry("foto_url", null);
    }

    @Test
    @DisplayName("CP-RF11-09: public profile exposes only public fields")
    void publicProfile() throws Exception {
        update().andExpect(status().isOk());
        upload(jpeg(3)).andExpect(status().isOk());
        mvc.perform(get(PUBLIC)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + dentistId + ")].name", contains("Laura María Peña Ortiz")))
                .andExpect(jsonPath("$[?(@.id == " + dentistId + ")].photoUrl", contains("https://example.test/photo")))
                .andExpect(jsonPath("$[?(@.id == " + dentistId + ")].academicTitles[0]", contains("Dentistry")))
                .andExpect(jsonPath("$[?(@.id == " + dentistId + ")].description", contains("Sample profile")))
                .andExpect(jsonPath("$..email").isEmpty()).andExpect(jsonPath("$..phone").isEmpty())
                .andExpect(jsonPath("$..userId").isEmpty()).andExpect(jsonPath("$..photoPublicId").isEmpty());
    }

    @Test
    @DisplayName("CP-RF11-10: registering \"Dra. Nueva Pérez\" stores first name \"Nueva\" and surname \"Pérez\"")
    void registration() throws Exception {
        var result = mvc.perform(post("/api/v1/dentists").with(as("AUXILIAR")).contentType("application/json")
                        .content("{\"name\":\"Dra. Nueva Pérez\",\"specialty\":\"Dentistry\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Nueva Pérez")).andReturn();
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        assertThat(db.queryForMap("SELECT primer_nombre, primer_apellido FROM odontologos WHERE id_odontologo=?",
                id.longValue())).containsEntry("primer_nombre", "Nueva").containsEntry("primer_apellido", "Pérez");
        mvc.perform(get(PUBLIC)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].name", contains("Nueva Pérez")));
    }

    @Test
    @DisplayName("CP-RF11-05: accepts exactly 5 MiB and rejects one byte more")
    void photoSize() throws Exception {
        upload(jpeg(5 * 1024 * 1024)).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value("https://example.test/photo"));
        upload(jpeg(5 * 1024 * 1024 + 1)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("La imagen no puede superar 5 MB."));
        assertPhotoStored();
    }

    @Test
    @DisplayName("CP-RF11-06: rejects PDF bytes declared as JPEG")
    void disguisedPdf() throws Exception {
        upload(new byte[]{'%', 'P', 'D', 'F'}).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("La imagen debe ser JPG, PNG o WebP."));
        mvc.perform(get(PROFILE).with(as("ODONTOLOGO"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").isEmpty());
    }

    @Test
    @DisplayName("CP-RF11-07: failed upload leaves the previous photo intact")
    void failedUpload() throws Exception {
        upload(jpeg(3)).andExpect(status().isOk());
        byte[] failingImage = jpeg(4);
        failingImage[3] = 42;
        upload(failingImage).andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.detail").value("No pudimos subir la imagen. Intenta de nuevo."));
        assertPhotoStored();
    }

    private ResultActions update() throws Exception {
        return mvc.perform(put(PROFILE).with(as("ODONTOLOGO")).contentType("application/json").content(UPDATE));
    }

    private ResultActions upload(byte[] bytes) throws Exception {
        return mvc.perform(multipart(HttpMethod.PUT, PHOTO)
                .file(new MockMultipartFile("photo", "photo.jpg", "image/jpeg", bytes)).with(as("ODONTOLOGO")));
    }

    private void assertPhotoStored() {
        assertThat(db.queryForMap("SELECT foto_url, foto_public_id FROM odontologos WHERE id_odontologo=?", dentistId))
                .containsEntry("foto_url", "https://example.test/photo").containsEntry("foto_public_id", "profile-photo");
    }

    private static byte[] jpeg(int size) {
        byte[] data = new byte[size];
        data[0] = (byte) 0xff;
        data[1] = (byte) 0xd8;
        data[2] = (byte) 0xff;
        return data;
    }

    @Test
    @DisplayName("CP-RF11-10: migrates legacy names on PostgreSQL 17 from Flyway V4")
    void migratesNames() throws Exception {
        var config = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("rf11_migration").target(MigrationVersion.fromVersion("4"));
        config.load().migrate();
        db.update("""
                INSERT INTO rf11_migration.odontologos(nombre)
                VALUES ('Dra. Laura Villamizar'), ('Dr. Andrés Peña'), ('Dra. Ana'),
                       ('Ana Pérez Ruiz'), ('Ana María del Carmen Pérez Ruiz'), ('Dr.Luis Ríos'), ('  Dra.  '), ('   ')
                """);
        config.target(MigrationVersion.fromVersion("5")).load().migrate();
        String names = """
                SELECT concat_ws('|', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, nombre)
                FROM rf11_migration.odontologos ORDER BY id_odontologo
                """;
        var split = db.queryForList(names, String.class);
        assertThat(split).containsExactly("Laura|Villamizar|Laura Villamizar", "Andrés|Peña|Andrés Peña",
                "Ana|Ana", "Ana|Pérez|Ruiz|Ana Pérez Ruiz", "Ana|María del Carmen|Pérez|Ruiz|Ana María del Carmen Pérez Ruiz",
                "Luis|Ríos|Luis Ríos", "Dra.|  Dra.  ", "|   ");
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(),
                postgres.getUsername(), postgres.getPassword())) {
            connection.setSchema("rf11_migration");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V5__dentist_profile.sql"));
        }
        assertThat(db.queryForList(names, String.class)).containsExactlyElementsOf(split);
    }

    @Test
    @DisplayName("CP-RF11-10: a single-token migrated dentist is listed publicly and returns a null firstSurname from GET /me/profile")
    void singleTokenMigratedDentist() throws Exception {
        var config = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("rf11_single_token").target(MigrationVersion.fromVersion("4"));
        config.load().migrate();
        db.update("INSERT INTO rf11_single_token.odontologos(nombre) VALUES ('Dra. Ana')");
        config.target(MigrationVersion.fromVersion("5")).load().migrate();

        // Attach the migrated name to the signed-in fixture in the application's schema.
        assertThat(db.update("""
                UPDATE odontologos AS dentist
                SET nombre = migrated.nombre, primer_nombre = migrated.primer_nombre,
                    segundo_nombre = migrated.segundo_nombre, primer_apellido = migrated.primer_apellido,
                    segundo_apellido = migrated.segundo_apellido
                FROM rf11_single_token.odontologos AS migrated
                WHERE dentist.id_odontologo = ?
                """, dentistId)).isOne();
        mvc.perform(get(PUBLIC)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + dentistId + ")].name", contains("Ana")));
        mvc.perform(get(PROFILE).with(as("ODONTOLOGO"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ana"))
                .andExpect(jsonPath("$.firstSurname").value(nullValue()))
                .andExpect(jsonPath("$.fullName").value("Ana"));
    }
}
