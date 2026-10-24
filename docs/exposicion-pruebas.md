# Niveles de prueba con ejemplos de Villadent AgendaPro

Guía para la exposición del martes 27 de octubre de 2026 (unos 15 minutos). Reemplaza la versión anterior, que usaba el prototipo con datos simulados.

- **Fuente:** rama `feature/frontend-api-integration`, commit `e767e88` (24/10/2026). El backend y el frontend ya están conectados.
- **Ejemplos:** todos son pruebas que existen en el repositorio y pasan. El código de cada fragmento está copiado tal cual del archivo, con su rango de líneas.
- **Verificación detallada:** afirmación por afirmación, en `docs/exposicion-pruebas-verificado.md`.
- **Capturas** del recorrido en el navegador: `docs/exposicion-capturas/`.

## 1. Qué hay en el proyecto

| | Frontend | Backend |
| --- | --- | --- |
| Ruta | `Desarrollo/frontend` | `Desarrollo/backend` |
| Stack | Angular 22.2.3, TypeScript, pnpm | Java 21, Spring Boot 4.1.2, PostgreSQL 17, arquitectura hexagonal |
| Herramientas de prueba | Vitest 5.0.4 con `TestBed` de Angular, jsdom 30.1.2 | JUnit Jupiter 6.0.3, Mockito, AssertJ, Testcontainers 2.0.5, ArchUnit 1.5.1 |
| Pruebas | **337 en 43 archivos**, todas pasan | **181 en 38 clases**, todas pasan |
| Comando | `pnpm test:ci` | `./gradlew test` (necesita Docker para PostgreSQL) |

Salidas del 24/10/2026:

```
Frontend (17:26:22 – 17:26:53):  Test Files 43 passed (43) · Tests 337 passed (337)
Backend  (17:25:26 – 17:26:15):  BUILD SUCCESSFUL in 47s · 38 classes · 181 tests · 0 failures · 0 errors
```

**Relación con el plan de pruebas:** de los 44 casos del plan, **39 tienen una prueba automatizada** que lleva su identificador en el nombre, por ejemplo `@DisplayName("CP-RF08-02: ...")`. Los 5 restantes son los que el plan no automatiza con pruebas unitarias ni de integración:
- 2 de nivel E2E: CP-RF01-02 y CP-RF07-01, que esperan Playwright;
- 3 manuales: CP-RNF01-01, CP-RNF02-01 y CP-RNF04-01.

Mapa de los ejemplos:

| Nivel | Ejemplo | Requisito |
| --- | --- | --- |
| Unitaria simple | Validación del teléfono en el dominio (`PatientTest`) | RF02 |
| Unitaria con doble de prueba | Reserva con los puertos simulados con Mockito (`BookAppointmentServiceTest`) | RF07 |
| Integración, bottom-up incremental | Dos reservas simultáneas contra PostgreSQL real (`StaffAgendaIntegrationTest`) | RF08 |
| Integración, big bang | Seguridad contra el servidor real (`SecurityConfigServerTest`) | RF09 |
| Un requisito en todos los niveles | "Una sola cita activa por paciente" | RF07 |
| Sistema | Recorrido en un navegador real, de punta a punta | Varios |
| Aceptación | Criterio Given-When-Then de RF07 | RF07 |

---

## 2. Ejemplo 1: prueba unitaria simple

**Archivo:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/patients/domain/model/PatientTest.java` (líneas 28 a 50)
**Casos del plan:** CP-RF02-03 (teléfono inválido).

```java
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
```

El código que prueba (`Desarrollo/backend/src/main/java/co/edu/unipamplona/villadent/modules/patients/domain/model/Patient.java`, líneas 49 a 61):

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

**Explicación bloque por bloque**

- **`@Test`** marca el método como prueba. **`@DisplayName("CP-RF02-03: ...")`** es el nombre que sale en el reporte, y empieza con el identificador del caso del plan. Así, si falla, se sabe de inmediato qué requisito se rompió.
- **`Patient.create(...)`** intenta crear un paciente con un dato inválido: vacío, `"300123456"` (9 dígitos) o `"2001234567"` (no empieza por 3).
- **`assertThatThrownBy(...)`** verifica tres cosas:
  1. que se lance una excepción;
  2. que sea `InvalidPatientDataException`;
  3. que su mensaje sea exactamente el que ve el usuario.

**Por qué se escribió así**

- **Es unitaria:** prueba una sola clase del dominio, `Patient`, sin Spring, sin base de datos y sin red. Cada prueba tarda 0 ms.
- **Un dato por cada rama del código:** vacío, menos de 10 dígitos, y 10 dígitos que no empiezan por 3. Son las tres particiones de equivalencia de la regla.
- **Arrange-Act-Assert en una línea:** el dato inválido es el *arrange*, `Patient.create` es el *act* y `assertThatThrownBy` es el *assert*. Con una regla pura, las tres fases caben juntas.
- **No se simula nada:** el dominio no depende de nada externo. La arquitectura hexagonal lo garantiza, y una prueba de ArchUnit lo vigila.
- **Los mensajes se comparan con las constantes** de `Patient` (`PHONE_LENGTH`, `PHONE_PREFIX`). El frontend tiene la misma regla con los mismos textos (`Desarrollo/frontend/src/app/core/domain/patient.spec.ts`), así que el usuario ve el mismo mensaje sin importar quién lo valide.

**Si falla:** un paciente quedaría registrado con un celular inválido, y el recordatorio de WhatsApp nunca le llegaría (RF05).

**Guion (1 minuto)**

> "El nivel más bajo es la prueba unitaria. Esta clase del dominio decide si el celular de un paciente es válido. La prueba no levanta Spring ni toca la base de datos: crea un paciente con un dato malo y espera la excepción con el mensaje exacto. Hay un dato por cada camino del código: vacío, menos de 10 dígitos y que no empieza por 3. El nombre de cada prueba empieza por el caso del plan, CP-RF02-03, así que el reporte se puede leer contra el plan. Y tarda cero milisegundos: por eso podemos tener cientos de estas."

---

## 3. Ejemplo 2: prueba unitaria con dobles de prueba (Mockito)

**Archivo:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/application/BookAppointmentServiceTest.java`
**Caso del plan:** CP-RF07-02 (una sola cita activa por paciente).

Preparación compartida (líneas 76 a 84):

```java
    private void activeDentistAndProcedure(int durationMinutes) {
        when(dentists.findById(1L)).thenReturn(Optional.of(
                new DentistResult(1L, "Dra. Laura Villamizar", "Odontología general", null, true)));
        when(procedures.findById(2L)).thenReturn(Optional.of(
                new ProcedureResult(2L, "Limpieza", durationMinutes, true)));
        when(schedules.listByDentist(1L)).thenReturn(List.of(
                new ScheduleResult(1L, 1L, 1, LocalTime.of(8, 0), LocalTime.of(12, 0), true)));
        when(appointments.findByDentistIdAndDate(1L, MONDAY)).thenReturn(List.of());
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

**Explicación bloque por bloque**

- **El servicio:** `BookAppointmentService` es el caso de uso "agendar una cita". Depende de seis puertos (odontólogos, horarios, procedimientos, pacientes, citas y recordatorios), y en la clase de prueba los seis son `@Mock`.
- **`activeDentistAndProcedure(30)`** prepara respuestas con `when(...).thenReturn(...)`: existe la Dra. Laura Villamizar, la Limpieza dura 30 minutos, la jornada es de 8:00 a 12:00 y no hay citas ese lunes.
- **Las dos líneas `when(...)` de la prueba** dicen que el paciente existe y que ya tiene **1** cita activa.
- **`assertThatThrownBy(...)`** espera la excepción `ActiveAppointmentExistsException`, con su mensaje.
- **`verify(appointments, never()).save(any())`** comprueba que **nunca** se intentó guardar una cita.

**Por qué se escribió así**

- **Stub y mock en la misma prueba:**
  - `when(...).thenReturn(...)` es un **stub**: solo devuelve datos preparados;
  - `verify(..., never())` es un **mock** en sentido estricto: verifica **cómo** se usó la dependencia.
  
  La diferencia importa: no basta con que salga el error; también hay que asegurar que el error llegue **antes** de guardar.
- **Qué se simuló:** los seis puertos, y el reloj, fijo en el 23/10/2026 con `Clock.fixed`.
- **Qué no se simuló:** el caso de uso y las reglas del dominio que usa. Eso es lo que se prueba.
- **Por qué simular:** sin los dobles, esta regla solo se podría probar con base de datos, datos cargados y un servidor, y la prueba pasaría de 1 ms a varios segundos.
- **Datos:** "Ana María Rueda" con `3001234567`, ficticios, y un lunes fijo (`2026-10-26`), para que el resultado no dependa del día en que se ejecute.

**Si falla:** un paciente podría tener varias citas activas a la vez, justo el bloqueo malintencionado de la agenda que RF07 quiere evitar.

**Guion (1,5 minutos)**

> "Ahora una unitaria con dobles de prueba. El caso de uso de agendar depende de seis piezas: odontólogos, horarios, procedimientos, pacientes, citas y recordatorios. Las reemplazamos con Mockito. Con `when` le decimos 'este paciente ya tiene una cita activa', y esperamos la excepción. Pero fíjense en la última línea: `verify` con `never` comprueba que nunca se llamó a guardar. Esa es la diferencia entre un stub y un mock: el stub solo responde, el mock además vigila cómo lo usaron. Lo que no simulamos es justo lo que queremos probar: la regla del caso de uso."

---

## 4. Ejemplo 3: prueba de integración, estrategia bottom-up incremental

**Archivo:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/infrastructure/web/StaffAgendaIntegrationTest.java` (líneas 224 a 253 de la prueba `savesOnlyOneSimultaneousPublicAndManualBooking`, líneas 221 a 257)
**Caso del plan:** CP-RF08-02 («Rechazar reservas simultáneas»).

```java
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
```

**Qué componentes reales se unen:**
- los controladores REST, a través de MockMvc;
- la seguridad con el token de la auxiliar;
- el caso de uso de reserva;
- los adaptadores JPA;
- **un PostgreSQL 17 real en Docker** (Testcontainers), con la migración de Flyway que crea la restricción `citas_sin_cruce`.

**Explicación bloque por bloque**

- **Las primeras líneas** crean los datos de la prueba en la base: un odontólogo, su horario y el procedimiento. También piden un token de auxiliar y dos teléfonos únicos.
- **`CountDownLatch start`** funciona como una "pistola de salida". Los dos hilos esperan en `start.await()`, y `start.countDown()` los suelta al mismo tiempo.
- **Los dos hilos** envían una reserva **pública** (sin token) y una **manual** (con el token de la auxiliar), las dos para las 10:00 con la misma odontóloga.
- **El primer `assertThat`** espera que una respuesta sea 201 (creada) y la otra 409 (conflicto), en cualquier orden.
- **El segundo `assertThat`** consulta la base y exige que exista **una sola** cita que ocupe las 10:00.

**Por qué ilustra la estrategia bottom-up incremental**

Las pruebas del backend están construidas en capas, de abajo hacia arriba:

1. **Dominio:** `AppointmentTest` prueba las reglas de la cita, sin nada alrededor.
2. **Casos de uso:** `BookAppointmentServiceTest` (el ejemplo 2) prueba el caso de uso con los puertos de abajo simulados.
3. **Integración:** esta prueba une las capas reales, una sobre otra ya probada.

Si esta prueba falla y las de abajo pasan, el problema está en cómo se unen las piezas (la transacción, la restricción o el adaptador), no en las reglas.

**Por qué esta prueba solo puede ser de integración:** la protección contra el doble agendamiento vive en la base de datos (la restricción `citas_sin_cruce`). Con un repositorio simulado, las dos reservas se guardarían y la prueba no demostraría nada. El plan de pruebas lo pide así: CP-RF08-02 es de nivel **I**.

**Si falla:** dos pacientes quedarían citados a la misma hora con la misma odontóloga.

**Guion (2 minutos)**

> "Subimos a integración. Esta es mi prueba favorita del proyecto. Un paciente reserva por la web y, al mismo tiempo, la auxiliar registra una cita manual en el mismo horario. Con un `CountDownLatch` soltamos las dos peticiones a la vez, como una pistola de salida. Esperamos que una responda 201 y la otra 409, y después revisamos la base: tiene que haber una sola cita a esa hora. Esto no se puede probar con mocks, porque la protección vive en la base de datos, en una restricción de PostgreSQL. Por eso usamos un PostgreSQL real en Docker. Es bottom-up: primero probamos el dominio, después el caso de uso con mocks, y aquí juntamos las capas reales."

---

## 5. Ejemplo 4: prueba de integración big bang

**Archivo:** `Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/shared/security/SecurityConfigServerTest.java`
**Casos del plan:** CP-RF09-04 (sin token → 401), además de las rutas públicas.

Cómo arranca y cómo hace las peticiones (líneas 26 a 48):

```java
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
```

Tres de sus pruebas (líneas 67 a 77 y 95 a 99):

```java
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
```

```java
    @Test
    @DisplayName("CP-RF09-04: a protected path without a token answers 401")
    void protectedPathWithoutTokenIsUnauthorized() throws Exception {
        assertThat(status("GET", "/api/v1/appointments")).isEqualTo(401);
    }
```

**Qué arranca:** todo a la vez, sin dobles de prueba.
- Tomcat, el servidor web real, en un puerto aleatorio (`RANDOM_PORT`);
- el contexto completo de Spring, con la seguridad;
- Flyway y PostgreSQL 17 en Docker.

**Explicación bloque por bloque**

- **`@SpringBootTest(webEnvironment = RANDOM_PORT)`** levanta la aplicación completa con un servidor web de verdad, en un puerto libre. **`@LocalServerPort`** recibe ese puerto.
- **`status(...)`** hace una petición HTTP real con `java.net.http.HttpClient`, como un navegador, y devuelve solo el código de estado.
- **Las tres pruebas** verifican la regla de acceso desde afuera, como la ve un cliente:
  - una ruta pública que no existe responde **404** (no existe), no **401** (no autorizado);
  - el endpoint público de odontólogos responde **200** sin token;
  - una ruta protegida sin token responde **401** (CP-RF09-04).

**Por qué contra el servidor real y no con MockMvc**

El proyecto también prueba la seguridad con MockMvc (`SecurityConfigIntegrationTest`), un servidor simulado que es más rápido. Pero un servidor real hace cosas que el simulado no hace. Por ejemplo, cuando una ruta no existe o algo falla, Tomcat reenvía internamente la petición a `/error`, y la seguridad también revisa ese reenvío. Por eso `SecurityConfig.java` tiene una regla explícita para que esos reenvíos se respondan con su código correcto (líneas 100 a 103):

```java
                // The servlet container forwards 404s and unhandled exceptions to /error.
                // Security re-checks that dispatch, so blocking it would turn every error
                // on a public path into a 401. The original request was already authorized.
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
```

Esa regla solo se puede verificar con todas las piezas encendidas a la vez: es justo el terreno del big bang.

**Por qué ilustra la estrategia big bang:** se juntan todos los componentes y se prueba el conjunto de una vez. Tiene dos caras:
- **Ventaja:** detecta problemas que **solo aparecen cuando todo funciona junto** (el servidor, la seguridad y la base de datos), y que ninguna prueba por partes puede ver.
- **Desventaja:** si una de estas pruebas falla, **cuesta más encontrar la causa**, porque cualquiera de las piezas puede ser la responsable. Además es más lenta: levanta un servidor y una base de datos.

Por eso no se usa sola: es la verificación final, encima de las pruebas por capas.

**Si falla:** o la API rechaza peticiones públicas que deberían pasar (el paciente no podría ver horarios ni agendar), o deja pasar sin token a una ruta protegida (se expondrían datos de pacientes, contra RNF03).

**Guion (2 minutos)**

> "El último ejemplo de integración es big bang. Esta prueba no simula nada: levanta el servidor web real, la seguridad, Spring y PostgreSQL. Después hace peticiones HTTP como lo haría un navegador. Verifica tres cosas: que una ruta pública que no existe diga 404, que el catálogo público responda sin token, y que una ruta protegida sin token diga 401. ¿Por qué no basta con MockMvc, que es más rápido? Porque el servidor real tiene comportamientos propios, como reenviar los errores a una ruta interna, y eso solo se ve con todo encendido. Esa es la ventaja del big bang: ve lo que aparece cuando todo está junto. Su desventaja: si falla, hay muchas piezas donde buscar. Por eso la usamos al final, encima de las pruebas por capas."

---

## 6. Las estrategias de integración en este proyecto

| Estrategia | Idea | Ejemplo real |
| --- | --- | --- |
| **Bottom-up** | Integrar de abajo hacia arriba; las capas de abajo ya están probadas y son reales | Backend: dominio → casos de uso → integración (ejemplo 3). Frontend: reglas de `core/domain` → `AppStore` → componentes → router y guards (`core/guards/staff-access.spec.ts`) |
| **Big bang** | Juntar todo y probar el conjunto de una vez | `SecurityConfigServerTest` (ejemplo 4) |
| **Top-down** | Integrar desde arriba, reemplazando por *stubs* los módulos de abajo que aún no existen | **No existe** en el proyecto. Lo más parecido es el ejemplo 2 (el caso de uso con los puertos de abajo simulados), pero se usó como prueba unitaria, no como paso de integración |
| **Incremental** | Agregar un módulo a la vez y probar en cada paso (bottom-up y top-down son variantes) | El backend se construyó así: un requisito por ciclo, cada uno con sus pruebas en verde antes del siguiente (ciclos 1 a 4, versiones 1.5 a 1.8 de la tabla de control de cambios) |

---

## 7. Un mismo requisito en todos los niveles: CP-RF07-02

Criterio de aceptación de RF07 (documento del proyecto): *«Dado que un paciente ya tiene una cita futura activa asociada a su número, cuando intenta agendar una segunda cita por sí mismo, entonces el sistema debe bloquear la acción y mostrar un mensaje de restricción.»*

| Nivel | Prueba | Qué verifica |
| --- | --- | --- |
| Unitaria (caso de uso) | `BookAppointmentServiceTest` — «CP-RF07-02: rejects a second active appointment for the same patient» | La regla, con los puertos simulados (ejemplo 2) |
| Unitaria (errores) | `ProblemDetailAdviceTest` — «CP-RF07-02: maps an active appointment conflict to 409» | Que la excepción se convierta en HTTP 409 con el código `ACTIVE_APPOINTMENT_EXISTS` |
| Integración (API + PostgreSQL) | `AppointmentBookingIntegrationTest` — «CP-RF07-02: blocks a second active appointment for the same phone» | La regla de punta a punta en el backend |
| Componente (frontend) | `booking-flow.spec.ts` — «blocks a phone that already has an active appointment» | Que la pantalla muestre el mensaje de restricción |
| Sistema (navegador) | Recorrido del 24/10/2026, paso «a second active appointment is blocked» | Todo junto, como lo vive el paciente (captura `3-segunda-cita-bloqueada.png`) |

La prueba de integración (`Desarrollo/backend/src/test/java/co/edu/unipamplona/villadent/modules/appointments/infrastructure/web/AppointmentBookingIntegrationTest.java`, líneas 227 a 246):

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

**Guion (1,5 minutos)**

> "Para cerrar la parte de niveles, miren un solo requisito: un paciente no puede tener dos citas activas. Lo probamos cinco veces, y no es repetición, porque cada nivel atrapa un error distinto. La unitaria prueba la regla. La de errores, que se traduzca a un 409. La de integración, que funcione con la base de datos real. La de componente, que el paciente vea el mensaje. Y la de sistema, que todo junto funcione en el navegador. Si mañana alguien rompe la traducción a 409, solo falla esa prueba, y sabemos exactamente dónde mirar."

---

## 8. Pruebas de sistema y de aceptación

**Sistema.** La prueba de sistema recorre la aplicación completa como la usaría una persona, en un navegador real, con el backend y la base de datos de verdad. El 24/10/2026 se hizo ese recorrido en Chromium y pasaron **18 de 18 verificaciones**:
1. Un paciente agenda en los 3 pasos y recibe su código.
2. El mismo teléfono no puede agendar una segunda cita.
3. La auxiliar ve la cita en su agenda, con una columna por odontólogo.
4. La odontóloga ve solo su agenda y no puede abrir los reportes.
5. Un enlace de cita inválido muestra «No encontramos esta cita».
6. No hay errores de JavaScript en la consola.

Las capturas están en `docs/exposicion-capturas/`. En el plan de pruebas, este nivel se automatiza con Playwright en los casos E2E (CP-RF01-02 y CP-RF07-01).

**Aceptación.** El criterio Given-When-Then de RF07 está verificado en código en todos los niveles (sección 7). La aceptación propiamente dicha la hacen los usuarios: la auxiliar y la doctora confirman que el incremento hace lo que necesitan. El plan la prevé en sesiones de validación, por ejemplo CP-RNF02-01: tres personas, una de ellas adulta mayor, agendan una cita sin ayuda.

**Guion (1 minuto)**

> "En la cima están sistema y aceptación. La de sistema recorre la aplicación completa en un navegador real: un paciente agenda, la auxiliar ve la cita y la odontóloga solo ve la suya. Dieciocho verificaciones, todas en verde. Y la aceptación es distinta a todas las demás: no la decide una prueba automática, la deciden los usuarios. Es la auxiliar de la clínica usando la aplicación y diciendo 'esto es lo que necesito'."

---

## 9. Verificación de los ejemplos (24/10/2026)

```
Backend
PASSED PatientTest :: CP-RF02-03: a blank phone is rejected (0.000s)
PASSED PatientTest :: CP-RF02-03: a phone with fewer than 10 digits is rejected (0.000s)
PASSED PatientTest :: CP-RF02-03: a phone that does not start with 3 is rejected (0.000s)
PASSED BookAppointmentServiceTest :: CP-RF07-02: rejects a second active appointment for the same patient (0.709s)
PASSED StaffAgendaIntegrationTest :: CP-RF08-02: only one of a simultaneous public and manual booking is saved (0.144s)
PASSED SecurityConfigServerTest :: A public path without a handler answers 404, not 401 (0.014s)
PASSED SecurityConfigServerTest :: CP-RF09-04: a protected path without a token answers 401 (0.008s)

Frontend
✓ src/app/features/public/components/booking-flow.spec.ts > BookingFlow > blocks a phone that already has an active appointment 113ms
✓ src/app/core/guards/staff-access.spec.ts > staff access guards > sends the dentist to /acceso-denegado when opening reports 48ms
```

Los tiempos ilustran la pirámide de pruebas: una prueba unitaria del dominio tarda 0 ms, mientras que la suite del backend, que levanta PostgreSQL varias veces, tarda 47 s. Por eso la mayoría de las pruebas son unitarias, y las de integración se reservan para lo que solo se puede probar con las piezas reales.

## 10. Distribución sugerida de los 15 minutos

| Minuto | Tema |
| --- | --- |
| 0–1 | Qué es Villadent y qué pruebas tiene (sección 1) |
| 1–2 | Ejemplo 1: unitaria simple |
| 2–3,5 | Ejemplo 2: unitaria con Mockito (stub frente a mock) |
| 3,5–5,5 | Ejemplo 3: integración bottom-up, la carrera de dos reservas |
| 5,5–7,5 | Ejemplo 4: integración big bang |
| 7,5–9 | Las estrategias de integración (sección 6) |
| 9–10,5 | Un requisito en todos los niveles (sección 7) |
| 10,5–11,5 | Sistema y aceptación (sección 8) |
| 11,5–15 | Cierre, la pirámide de pruebas y preguntas |
