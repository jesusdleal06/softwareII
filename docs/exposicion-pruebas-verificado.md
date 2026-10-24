# Verificación de la exposición "Niveles de prueba" contra el repositorio

- **Verificado el:** 2026-10-24, entre 17:25 y 17:35 (hora de Colombia, UTC−5).
- **Rama y commit:** `feature/frontend-api-integration`, commit `e767e88`. El código no tiene cambios pendientes; solo la documentación de la exposición está sin commit.
- **Qué verifica:** cada afirmación de `docs/exposicion-pruebas.md`. **Reemplaza la verificación del 23/10**, que se hizo sobre el prototipo con datos simulados.
- **Método:**
  - se ejecutaron las dos suites completas;
  - cada fragmento de código se insertó automáticamente desde su archivo, con su rango de líneas, sin reescribirlo ni traducirlo;
  - no se modificó código del proyecto para esta verificación.
- **Leyenda:** ✅ CORRECTO · ❌ INCORRECTO (con el dato real) · ⚠️ NO CONFIRMADO (con lo que falta). "NO EXISTE" se usa literalmente cuando algo no está en el repositorio.

## Tabla resumen

| Punto | Estado | Observación corta |
| --- | --- | --- |
| 1. Cifras generales | ✅ | Frontend 337/337 en 43 archivos; backend 181/181 en 38 clases; 39 de 44 casos del plan con prueba |
| 2. Ejemplo 1: `PatientTest` | ✅ | Tres pruebas CP-RF02-03 con los mensajes exactos |
| 3. Ejemplo 2: `BookAppointmentServiceTest` | ✅ | Mockito con `when` (stub) y `verify(never())` (mock) |
| 4. Ejemplo 3: CP-RF08-02 | ✅ | Dos reservas simultáneas contra PostgreSQL real; una 201 y otra 409 |
| 5. Ejemplo 4: `SecurityConfigServerTest` | ✅ | Servidor real; 404, 200 y 401 en las rutas que corresponde |
| 6. Estrategias de integración | ✅ | Bottom-up y big bang con ejemplo real; top-down NO EXISTE |
| 7. CP-RF07-02 en todos los niveles | ✅ | Cinco pruebas en cinco niveles, todas encontradas |
| 8. Sistema y aceptación | ✅ | Recorrido en navegador real 18/18 con capturas; el plan prevé E2E con Playwright y sesiones de aceptación |
| 9. Plan de pruebas | ✅ | Versión 1.2, 44 casos; los 5 sin prueba son E2E o manuales |
| 10. Cambios frente a la versión anterior | — | Lista para rehacer las diapositivas (al final) |

**Conteo por afirmación verificada:** ✅ 46 · ❌ 0 · ⚠️ 0.

---

## 1. Cifras generales

### Ejecuciones

Frontend: `pnpm exec ng test --watch=false --reporters=verbose` en `Desarrollo/frontend`, con la caché de Vitest vacía (`rm -rf node_modules/.vitest-cache`). Inicio: 2026-10-24 17:26:22 −0500; fin: 17:26:53.

```
 RUN  v5.0.4 /home/josue/Documentos/Universidad/softwareII/proyecto/Desarrollo/frontend
 Test Files  43 passed (43)
      Tests  337 passed (337)
   Duration  25.37s
```

Backend: `./gradlew test --rerun-tasks` en `Desarrollo/backend`. Inicio: 2026-10-24 17:25:26 −0500; fin: 17:26:15.

```
BUILD SUCCESSFUL in 47s
classes=38 tests=181 failures=0 errors=0 skipped=0
```

### Afirmaciones

| # | Afirmación | Resultado | Evidencia |
| --- | --- | --- | --- |
| 1.1 | Angular 22.2.3, Vitest 5.0.4, jsdom 30.1.2 | ✅ | Versiones instaladas (`node -p "require('<paquete>/package.json').version"`) |
| 1.2 | 337 pruebas en 43 archivos, todas pasan | ✅ | Salida de arriba |
| 1.3 | Java 21 y Spring Boot 4.1.2 | ✅ | `build.gradle`: `languageVersion = JavaLanguageVersion.of(21)` y `id 'org.springframework.boot' version '4.1.2'`; JDK local `openjdk version "21.0.12.1"` |
| 1.4 | JUnit Jupiter 6.0.3, Mockito, AssertJ, Testcontainers 2.0.5, ArchUnit 1.5.1 | ✅ | Dependencias resueltas por Gradle (`org.junit.jupiter:junit-jupiter-api:5.13.4 -> 6.0.3`, `org.testcontainers:testcontainers:2.0.5`, `com.tngtech.archunit:archunit:1.5.1`). Mockito viene con `spring-boot-starter-test` |
| 1.5 | 181 pruebas en 38 clases, todas pasan | ✅ | Salida de arriba |
| 1.6 | 39 de los 44 casos del plan tienen prueba con su identificador | ✅ | Se compararon los 44 identificadores del plan con los `CP-` encontrados en `Desarrollo/backend/src/test` y `Desarrollo/frontend/src` |
| 1.7 | Los 5 sin prueba son CP-RF01-02 y CP-RF07-01 (E2E), y CP-RNF01-01, CP-RNF02-01 y CP-RNF04-01 (manuales) | ✅ | El nivel de cada uno, según el plan: `E2E`, `E2E`, `M`, `M`, `M` |
| 1.8 | El frontend está conectado al backend | ✅ | Commit `2460cac` («feat(frontend): connect the app to the backend API»); `Desarrollo/frontend/src/app/core/api/clinic-api.ts` llama a `/api/v1/**`, y `mock-data.ts` ya no existe |

---

## 2. Ejemplo 1: `PatientTest`

**Ruta:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/patients/domain/model/PatientTest.java` (líneas 1 a 60; las tres pruebas citadas están en las líneas 28 a 50)

```java
package co.edu.unipamplona.villadent.modules.patients.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.patients.domain.error.InvalidPatientDataException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PatientTest {

    @Test
    @DisplayName("CP-RF02-02: a blank name is rejected with the prototype message")
    void blankNameIsRejected() {
        assertThatThrownBy(() -> Patient.create(" ", "3001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.NAME_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-02: a single word is not a full name")
    void singleWordNameIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana", "3001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.FULL_NAME_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-03: a blank phone is rejected")
    void blankPhoneIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", " "))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_REQUIRED);
    }

    @Test
    @DisplayName("CP-RF02-03: a phone with fewer than 10 digits is rejected")
    void shortPhoneIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", "300123456"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_LENGTH);
    }

    @Test
    @DisplayName("CP-RF02-03: a phone that does not start with 3 is rejected")
    void wrongPrefixIsRejected() {
        assertThatThrownBy(() -> Patient.create("Ana María", "2001234567"))
                .isInstanceOf(InvalidPatientDataException.class)
                .hasMessage(Patient.PHONE_PREFIX);
    }

    @Test
    void normalizesSpacesAndThePhone() {
        Patient patient = Patient.create("  Ana   María   Rueda ", "300 123 4567");

        assertThat(patient.fullName()).isEqualTo("Ana María Rueda");
        assertThat(patient.phone()).isEqualTo("3001234567");
        assertThat(patient.isActive()).isTrue();
    }
}
```

Mensajes y regla (`Desarrollo/backend/src/main/java/co/edu/unipamplona/villadent/modules/patients/domain/model/Patient.java`, líneas 10 a 12 y 49 a 61):

```java
    public static final String PHONE_REQUIRED = "El número de celular es obligatorio.";
    public static final String PHONE_LENGTH = "El celular debe tener 10 dígitos.";
    public static final String PHONE_PREFIX = "Escribe un celular colombiano válido (empieza por 3).";
```

```java
    public static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new InvalidPatientDataException(PHONE_REQUIRED);
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() != 10) {
            throw new InvalidPatientDataException(PHONE_LENGTH);
        }
        if (!digits.startsWith("3")) {
            throw new InvalidPatientDataException(PHONE_PREFIX);
        }
        return digits;
    }
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 2.1 | Las tres pruebas llevan CP-RF02-03 en su `@DisplayName` | ✅ (líneas 29, 37 y 45) |
| 2.2 | Las entradas son vacío, `"300123456"` (9 dígitos) y `"2001234567"` | ✅ |
| 2.3 | Los mensajes son los mismos que muestra el frontend | ✅ «El número de celular es obligatorio.», «El celular debe tener 10 dígitos.», «Escribe un celular colombiano válido (empieza por 3).» están en `Patient.java` y en `Desarrollo/frontend/src/app/core/domain/patient.ts` |
| 2.4 | Es unitaria: sin Spring ni base de datos, 0 ms | ✅ La clase no tiene anotaciones de Spring; los tres tiempos medidos son `0.000s` |

---

## 3. Ejemplo 2: `BookAppointmentServiceTest`

**Ruta:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/application/BookAppointmentServiceTest.java`

Configuración de Mockito, reloj fijo y servicio (líneas 43 a 89):

```java
@ExtendWith(MockitoExtension.class)
class BookAppointmentServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-23T12:00:00Z"), ZoneId.of("America/Bogota"));

    @Mock
    private FindDentistUseCase dentists;

    @Mock
    private ListSchedulesUseCase schedules;

    @Mock
    private FindProcedureUseCase procedures;

    @Mock
    private ResolvePatientUseCase patients;

    @Mock
    private AppointmentRepository appointments;

    @Mock
    private ScheduleReminderUseCase scheduleReminder;

    private BookAppointmentService service;

    @BeforeEach
    void setUp() {
        service = new BookAppointmentService(
                dentists, schedules, procedures, patients, appointments, scheduleReminder, CLOCK);
    }

    private void activeDentistAndProcedure(int durationMinutes) {
        when(dentists.findById(1L)).thenReturn(Optional.of(
                new DentistResult(1L, "Dra. Laura Villamizar", "Odontología general", null, true)));
        when(procedures.findById(2L)).thenReturn(Optional.of(
                new ProcedureResult(2L, "Limpieza", durationMinutes, true)));
        when(schedules.listByDentist(1L)).thenReturn(List.of(
                new ScheduleResult(1L, 1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0), true)));
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of());
    }

    private BookAppointmentCommand command(LocalTime time, AppointmentOrigin origin) {
        return new BookAppointmentCommand(
                "Ana María Rueda", "3001234567", 1L, 2L, MONDAY, time, origin);
    }
```

La prueba (líneas 91 a 104):

```java
    @Test
    @DisplayName("CP-RF07-02: rejects a second active appointment for the same patient")
    void rejectsASecondActiveAppointment() {
        activeDentistAndProcedure(30);
        when(patients.resolve(new ResolvePatientCommand("Ana María Rueda", "3001234567")))
                .thenReturn(new PatientResult(5L, "Ana María Rueda", "3001234567", true));
        when(appointments.countActiveByPatientFrom(5L, LocalDate.of(2026, 10, 23))).thenReturn(1L);

        assertThatThrownBy(() -> service.book(command(LocalTime.of(9, 0), AppointmentOrigin.WEB)))
                .isInstanceOf(ActiveAppointmentExistsException.class)
                .hasMessage(ActiveAppointmentExistsException.MESSAGE);

        verify(appointments, never()).save(any());
    }
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 3.1 | Los seis puertos del caso de uso son `@Mock` | ✅ Líneas 50 a 66: `FindDentistUseCase`, `ListSchedulesUseCase`, `FindProcedureUseCase`, `ResolvePatientUseCase`, `AppointmentRepository`, `ScheduleReminderUseCase` |
| 3.2 | El reloj está fijo | ✅ Línea 47: `Clock.fixed(Instant.parse("2026-10-23T12:00:00Z"), ZoneId.of("America/Bogota"))` |
| 3.3 | `when(...).thenReturn(...)` actúa como stub y `verify(..., never())` como mock | ✅ Líneas 95 a 97 y 103 |
| 3.4 | Espera `ActiveAppointmentExistsException` con su mensaje | ✅ Líneas 99 a 101 |
| 3.5 | Pasa | ✅ `PASSED ... CP-RF07-02: rejects a second active appointment for the same patient (0.709s)` |

---

## 4. Ejemplo 3: CP-RF08-02, dos reservas simultáneas

**Ruta:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/infrastructure/web/StaffAgendaIntegrationTest.java`

Configuración de la clase (líneas 49 a 52):

```java
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class StaffAgendaIntegrationTest {
```

La prueba completa (líneas 221 a 257):

```java
    @Test
    @DisplayName("CP-RF08-02: only one of a simultaneous public and manual booking is saved")
    void savesOnlyOneSimultaneousPublicAndManualBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        String publicPhone = uniquePhone();
        String manualPhone = uniquePhone();

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> publicBooking = pool.submit(() -> {
                start.await();
                return bookPublic(dentist, cleaning, date, LocalTime.of(10, 0), "Ana María Rueda", publicPhone);
            });
            Future<MvcResult> manualBooking = pool.submit(() -> {
                start.await();
                return bookManual(token, dentist, cleaning, date, LocalTime.of(10, 0),
                        "Carlos Pérez", manualPhone);
            });
            start.countDown();

            List<Integer> statuses = List.of(
                    publicBooking.get().getResponse().getStatus(),
                    manualBooking.get().getResponse().getStatus());
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
            assertThat(appointments.findByDentistIdAndDate(dentist.id(), date).stream()
                    .filter(appointment -> appointment.time().equals(LocalTime.of(10, 0)))
                    .filter(Appointment::occupiesSlot))
                    .hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }
```

La restricción que la hace posible (`Desarrollo/backend/src/main/resources/db/migration/V1__initial_schema.sql`, líneas 112 a 118):

```sql
-- No double booking, enforced by the database (CP-RF07-03, CP-RF08-02).
-- The overlapping interval is the appointment slot: [fecha + hora, fecha + hora + duracion_min).
ALTER TABLE citas
    ADD CONSTRAINT citas_sin_cruce EXCLUDE USING gist (
        id_odontologo WITH =,
        tsrange(fecha + hora, fecha + hora + make_interval(mins => duracion_min)) WITH &&
    ) WHERE (estado IN ('PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'));
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 4.1 | Une el controlador (MockMvc), la seguridad, el caso de uso, JPA y PostgreSQL real | ✅ `@SpringBootTest` + `@AutoConfigureMockMvc` + `@Import(TestcontainersConfiguration.class)` (`postgres:17-alpine`) |
| 4.2 | Las dos reservas salen a la vez con un `CountDownLatch` | ✅ Líneas 232 a 244 |
| 4.3 | Una responde 201 y la otra 409, y queda una sola cita | ✅ Líneas 249 a 253 |
| 4.4 | La protección vive en la base de datos (`citas_sin_cruce`) | ✅ Restricción `EXCLUDE USING gist` de la migración V1 |
| 4.5 | Pasa | ✅ `PASSED ... CP-RF08-02: only one of a simultaneous public and manual booking is saved (0.144s)` |

---

## 5. Ejemplo 4: `SecurityConfigServerTest`

**Ruta:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/shared/security/SecurityConfigServerTest.java` (archivo completo, líneas 1 a 106)

```java
package co.edu.unipamplona.villadent.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

/**
 * Runs against the real embedded server. MockMvc does not forward a 404 or a
 * thrown exception to /error, so it cannot catch a security rule that blocks
 * the error dispatch and turns every public error into a 401.
 */
@Import(co.edu.unipamplona.villadent.TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.bootstrap-admin.enabled=false")
class SecurityConfigServerTest {

    private final HttpClient client = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    private int status(String method, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private int loginStatus(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private String createUser() {
        String email = "login-" + UUID.randomUUID() + "@villadent.co";
        users.save(User.create("Usuario de prueba", email, passwordHasher.hash("clave-segura"), Role.AUXILIAR));
        return email;
    }

    @Test
    @DisplayName("A public path without a handler answers 404, not 401")
    void publicPathWithoutHandlerIsNotFound() throws Exception {
        assertThat(status("GET", "/api/v1/public/does-not-exist")).isEqualTo(404);
    }

    @Test
    @DisplayName("The public dentists endpoint answers 200 without a token")
    void publicDentistsEndpointIsPermitted() throws Exception {
        assertThat(status("GET", "/api/v1/public/dentists")).isEqualTo(200);
    }

    @Test
    @DisplayName("CP-RF09-02: a wrong password answers 401")
    void wrongPasswordIsUnauthorized() throws Exception {
        String email = createUser();

        assertThat(loginStatus(email, "clave-incorrecta")).isEqualTo(401);
    }

    @Test
    @DisplayName("Valid credentials answer 200")
    void validCredentialsAreAccepted() throws Exception {
        String email = createUser();

        assertThat(loginStatus(email, "clave-segura")).isEqualTo(200);
    }

    @Test
    @DisplayName("CP-RF09-04: a protected path without a token answers 401")
    void protectedPathWithoutTokenIsUnauthorized() throws Exception {
        assertThat(status("GET", "/api/v1/appointments")).isEqualTo(401);
    }

    @Test
    @DisplayName("The health check is public")
    void healthIsPublic() throws Exception {
        assertThat(status("GET", "/actuator/health")).isEqualTo(200);
    }
}
```

La regla de seguridad citada en la guía (`Desarrollo/backend/src/main/java/co/edu/unipamplona/villadent/shared/security/SecurityConfig.java`, líneas 99 a 104):

```java
            .authorizeHttpRequests(auth -> auth
                // The servlet container forwards 404s and unhandled exceptions to /error.
                // Security re-checks that dispatch, so blocking it would turn every error
                // on a public path into a 401. The original request was already authorized.
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers("/api/v1/public/**", "/api/v1/auth/login", "/actuator/health").permitAll()
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 5.1 | Arranca Tomcat en puerto aleatorio, Spring, Flyway y PostgreSQL 17, sin dobles | ✅ `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@Import(TestcontainersConfiguration.class)`; peticiones reales con `java.net.http.HttpClient` |
| 5.2 | Ruta pública inexistente → 404; catálogo público → 200 sin token; ruta protegida sin token → 401 (CP-RF09-04) | ✅ Líneas 67 a 71, 73 a 77 y 95 a 99 |
| 5.3 | La seguridad también se prueba con MockMvc en `SecurityConfigIntegrationTest` | ✅ `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/shared/security/SecurityConfigIntegrationTest.java` (`@AutoConfigureMockMvc`) |
| 5.4 | `SecurityConfig.java` permite explícitamente el reenvío interno de errores (líneas 100 a 103) | ✅ `.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()`, línea 103 |
| 5.5 | Las pruebas pasan | ✅ Las 6 pruebas de la clase pasan (`PASSED`, 24/10/2026) |

---

## 6. Estrategias de integración

| # | Afirmación | Resultado | Evidencia |
| --- | --- | --- | --- |
| 6.1 | Bottom-up en el backend: dominio → casos de uso → integración | ✅ | Existen `AppointmentTest` (dominio), `BookAppointmentServiceTest` (casos de uso, con Mockito) y `StaffAgendaIntegrationTest` (integración) |
| 6.2 | Bottom-up en el frontend: reglas → `AppStore` → componentes → router y guards | ✅ | `core/domain/*.spec.ts`, `core/services/app-store.service.spec.ts`, specs de componentes y `core/guards/staff-access.spec.ts` (líneas 23 a 40 y 56 a 59, abajo) |
| 6.3 | Big bang: `SecurityConfigServerTest` | ✅ | Punto 5 |
| 6.4 | Top-down NO EXISTE | ✅ | No hay `@WebMvcTest` ni `@MockitoBean` en `Desarrollo/backend/src/test`: ninguna prueba integra desde el controlador con los casos de uso simulados |
| 6.5 | Incremental: un requisito por ciclo, versiones 1.5 a 1.8 | ✅ | Commits `263fcd6` (1.5), `2ba96e6` (1.6), `f6166ce` (1.7) y `394b3e7` (1.8), cada uno después de su ciclo |
| 6.6 | El backend es hexagonal: los controladores llaman a casos de uso mediante puertos | ✅ | 7 módulos en `modules/` (`appointments`, `dentists`, `patients`, `procedures`, `reminders`, `reports`, `users`), cada uno con `domain`, `application` e `infrastructure`; 12 controladores; `AppointmentController` depende de `BookAppointmentUseCase`, `GetAgendaUseCase` y `ChangeAppointmentStatusUseCase` (puertos en `domain/ports/drivers`). ArchUnit lo vigila, con sus propias pruebas de reglas (`ArchitectureRulesTest`) |

`Desarrollo/frontend/src/app/core/guards/staff-access.spec.ts`, líneas 23 a 40:

```ts
  function setup(session?: Session): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: memoryStorage(session) },
        // The real AppStore talks to the API: keep every request inside the test.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  }

  async function navigate(url: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }
```

Líneas 56 a 59:

```ts
  it('sends the dentist to /acceso-denegado when opening reports', async () => {
    setup(DENTIST_SESSION);
    expect(await navigate('/panel/reportes')).toBe('/acceso-denegado?ruta=%2Fpanel%2Freportes');
  });
```

---

## 7. CP-RF07-02 en todos los niveles

Criterio de aceptación de RF07 (`Documentacion/PROYECTO_JOSUE_DIEGO_JESUS.docx`): «Dado que un paciente ya tiene una cita futura activa asociada a su número, cuando intenta agendar una segunda cita por sí mismo, entonces el sistema debe bloquear la acción y mostrar un mensaje de restricción.»

Traducción a 409 (`Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/shared/error/ProblemDetailAdviceTest.java`, líneas 26 a 35):

```java
    @Test
    @DisplayName("CP-RF07-02: maps an active appointment conflict to 409")
    void mapsActiveAppointmentConflict() {
        ProblemDetail problemDetail = advice.handleDomainException(new ActiveAppointmentExistsException());

        assertThat(problemDetail.getStatus()).isEqualTo(409);
        assertThat(problemDetail.getProperties().get("code")).isEqualTo("ACTIVE_APPOINTMENT_EXISTS");
        assertThat(problemDetail.getDetail()).isEqualTo(
                "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva.");
    }
```

Integración (`Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/infrastructure/web/AppointmentBookingIntegrationTest.java`, líneas 227 a 246):

```java
    @Test
    @DisplayName("CP-RF07-02: blocks a second active appointment for the same phone")
    void blocksASecondActiveAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String phone = uniquePhone();

        book(dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", phone);

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, cleaning,
                                date, LocalTime.of(10, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ACTIVE_APPOINTMENT_EXISTS"))
                .andExpect(jsonPath("$.detail").value(
                        "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva."));
    }
```

Componente (`Desarrollo/frontend/src/app/features/public/components/booking-flow.spec.ts`, líneas 156 a 169):

```ts
  it('blocks a phone that already has an active appointment', async () => {
    store.createAppointment.mockResolvedValue({ ok: false, reason: 'cita-activa' });
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Rosa Elvira Jaimes', '313 555 6677');
    clickButton(el, 'Confirmar cita');
    await refresh();

    expect(text(el)).toContain('Ya tienes una cita programada');
    expect(text(el)).toContain('Con el celular 313 555 6677 ya existe una cita activa.');
    expect(text(el)).toContain('Usa el enlace personal de tu recordatorio para reprogramarla o cancelarla.');
  });
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 7.1 | Hay una prueba de caso de uso (Mockito) | ✅ `BookAppointmentServiceTest`, línea 92 |
| 7.2 | Hay una prueba de traducción a 409 | ✅ `ProblemDetailAdviceTest`, línea 27 |
| 7.3 | Hay una prueba de integración con PostgreSQL | ✅ `AppointmentBookingIntegrationTest`, línea 228 |
| 7.4 | Hay una prueba de componente en el frontend | ✅ `booking-flow.spec.ts`, línea 156. Nota: el doble de prueba devuelve `'cita-activa'`; la traducción real del 409 la prueba `app-store.service.spec.ts` («translates an active-appointment rejection») |
| 7.5 | El recorrido en el navegador lo verificó | ✅ Paso «a second active appointment is blocked» (punto 8); captura `docs/exposicion-capturas/3-segunda-cita-bloqueada.png` |

---

## 8. Sistema y aceptación

Recorrido en el navegador del 24/10/2026, ejecución de las 17:10 (capturas de 17:10:29 a 17:10:44):
- **Entorno:** Chromium sin interfaz, manejado por el protocolo de depuración de Chrome;
- **Sistema bajo prueba:** backend con el perfil `demo`, PostgreSQL 17 y frontend con `ng serve`.

```
PASS booking lists the real dentists
PASS booking lists the real procedures
PASS real availability renders morning slots
PASS step 3 asks to confirm
PASS booking is saved through the API  [8:00 AM]
PASS the success screen shows the real code  [VD-1002]
PASS focus moves to the success heading  [H1]
PASS a second active appointment is blocked
PASS assistant lands on the agenda
PASS the assistant agenda shows the web booking
PASS the agenda draws one column per dentist  [3]
PASS reports load
PASS logout returns to the login page  [/ingreso]
PASS dentist lands on her agenda
PASS the dentist sees her own appointment
PASS the dentist is denied the reports
PASS an unknown manage link shows "No encontramos esta cita"
PASS no JavaScript errors in the console

18/18 UI checks passed
```

| # | Afirmación | Resultado |
| --- | --- | --- |
| 8.1 | El recorrido pasó 18 de 18 verificaciones | ✅ Salida de arriba |
| 8.2 | Las capturas están en `docs/exposicion-capturas/` | ✅ 6 imágenes: `1-paciente-confirma.png`, `2-cita-agendada.png`, `3-segunda-cita-bloqueada.png`, `4-agenda-auxiliar.png`, `5-agenda-odontologa.png`, `6-enlace-invalido.png` |
| 8.3 | El plan automatiza este nivel con Playwright en los casos E2E CP-RF01-02 y CP-RF07-01 | ✅ Sección 6.1 del plan (herramienta Playwright) y nivel `E2E` de ambos casos |
| 8.4 | El plan prevé la aceptación en sesiones de validación con usuarios, por ejemplo CP-RNF02-01 | ✅ Sección 6.1 del plan («Sesiones de validación RAD») y caso CP-RNF02-01 (nivel `M`) |

---

## 9. Plan de pruebas

**Ruta:** `Documentacion/pruebas/Actividad módulo 2_Plan de pruebas.docx`, versión 1.2 (22/10/2026).

| # | Afirmación | Resultado |
| --- | --- | --- |
| 9.1 | Contempla pruebas unitarias, de integración, E2E, de aceptación y no funcionales | ✅ Sección 6.1 |
| 9.2 | Prevé Playwright para E2E | ✅ Sección 6.1; Playwright no está instalado en el proyecto |
| 9.3 | Tiene 44 casos (39 funcionales y 5 no funcionales) | ✅ Sección 11 y conteo de identificadores |
| 9.4 | La matriz de trazabilidad sigue en «Pendiente» | ✅ La llena QA al ejecutar (sección 13). Que haya pruebas automatizadas no cambia ese estado |


---

## 10. Cambios para las diapositivas

Las diapositivas se armaron con la versión anterior de la guía (el prototipo del 23/10). Estos son los datos y ejemplos que cambiaron:

| Diapositiva | Decía o podría decir | Dato real hoy |
| --- | --- | --- |
| Cifras | Frontend 326 pruebas; backend 12 pruebas en 6 clases | Frontend **337 en 43 archivos**; backend **181 en 38 clases** |
| Cifras | JUnit 5 | JUnit Jupiter **6.0.3** |
| Cifras | El frontend usa datos simulados; el backend no implementa ningún RF | El frontend está **conectado** al backend; los RF01–RF10 están implementados; 39 de 44 casos del plan tienen prueba |
| 6 (unitaria simple) | `patient.spec.ts` del frontend, sin ID de caso | Ejemplo nuevo: `PatientTest.java` (backend), con CP-RF02-03 en el nombre. El de frontend sigue existiendo y es válido |
| 7–8 (doble de prueba) | `new-appointment-panel.spec.ts` con `vi.spyOn` | Ejemplo nuevo: `BookAppointmentServiceTest` con Mockito (`when` = stub, `verify(never())` = mock), caso CP-RF07-02 |
| 9 y 14 (arquitectura) | El backend no tiene controladores ni casos de uso | **Ya existe:** 7 módulos hexagonales y 12 controladores que llaman a casos de uso por puertos |
| 10–11 (bottom-up) | Guards del frontend como ejemplo principal | Ejemplo principal nuevo: CP-RF08-02 contra PostgreSQL real. `staff-access.spec.ts` sigue como bottom-up del frontend; ahora incluye `provideHttpClientTesting()` |
| 12 (big bang) | Código de CP-RF09-04 solo, o la historia del 401 | Mostrar el ejemplo como big bang: qué levanta (servidor real, seguridad, PostgreSQL) y sus tres pruebas (líneas 67 a 77 y 95 a 99). Sin la historia del 401 |
| 13 (big bang) | Historia del 401 | Reemplazarla por «Por qué contra el servidor real y no con MockMvc», y las ventajas y desventajas del big bang (sección 5 de la guía) |
| 22 y 31 (sistema y aceptación) | No hay pruebas de sistema | Recorrido en navegador real con 18 de 18 verificaciones y capturas; la aceptación la hacen los usuarios en las sesiones previstas por el plan |
| Nueva | — | Sección «Un requisito en todos los niveles» (CP-RF07-02 en cinco niveles) |
