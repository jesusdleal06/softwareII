# Backend development prompt — Villadent AgendaPro

Read this whole file before writing backend code. It is the brief for any agent or developer working in `Desarrollo/backend`. When it conflicts with an older note, this file wins; when it conflicts with the test plan or a requirement, stop and ask.

## 1. What you are building

A REST API for Centro Odontológico Villadent: patients check availability and book online, the clinic sends WhatsApp reminders, patients confirm, cancel or reschedule from the reminder link, and staff manage a central agenda and monthly reports. Methodology: RAD, one tested increment per cycle.

Sources of truth, in this order:

1. **Requirements** RF01–RF10 and RNF01–RNF05: `Documentacion/PROYECTO_JOSUE_DIEGO_JESUS.docx`.
2. **Test plan** (cases `CP-RFxx-nn`): `Documentacion/pruebas/Actividad módulo 2_Plan de pruebas.docx`. A requirement is done only when its cases pass. Follow the "Test plan" section of the root `CLAUDE.md`.
3. **Data model**: the class and entity-relationship diagrams in `Actividades/Actividad_3.docx`, extended as described in section 6.
4. **Behavior reference**: the Angular prototype already implements the business rules against mock data. Reuse its rules and Spanish messages instead of inventing new ones: `Desarrollo/frontend/src/app/core/domain/` (availability, patient, reports) and `core/services/app-store.service.ts`.

Decisions already taken, do not reopen them:

- **The patient never signs in.** Only staff have accounts, with two roles: `AUXILIAR` and `ODONTOLOGO`. The patient books from the public site and manages one appointment through a personal, unguessable link sent in the WhatsApp reminder.
- **The patient is its own table**, identified by a unique phone number, linked to its appointments. It is not a user and has no role.
- **Nothing is physically deleted** (section 7).

## 2. Stack and build

Java 21, Spring Boot 4.1.2, Gradle 9.8.1, PostgreSQL 17 (Neon in production), Flyway, Spring Data JPA (Hibernate), Spring Security with JWT (OAuth2 resource server), Bean Validation, MapStruct, JUnit Jupiter 6 (the version Spring Boot 4.1.2 manages), Mockito, AssertJ, Testcontainers, ArchUnit. Deploy: Render (API), Vercel (frontend), Neon (database).

The current `build.gradle` needs these changes before the first feature. Do them in one `build:` commit:

| Change | Why |
| --- | --- |
| Use the released `org.springframework.boot` plugin `4.1.2` instead of `4.1.2-SNAPSHOT`, and remove the `repo.spring.io/snapshot` repositories from `build.gradle` and `settings.gradle` | A snapshot changes under you between builds; 4.1.2 is already published on Maven Central |
| Add `implementation 'org.mapstruct:mapstruct:1.6.3'` and `annotationProcessor 'org.mapstruct:mapstruct-processor:1.6.3'` | Mapper between layers (section 5) |
| Add `testImplementation 'com.tngtech.archunit:archunit-junit5:1.5.1'` | Tests that enforce the hexagonal boundaries (section 3) |
| Add the core `jacoco` plugin with a branch-coverage check of at least 70 % on the availability and reminder packages | Exit criterion of the test plan |
| Add `spring-boot-starter-actuator`, exposing only `health` | Render health check |
| Fix the description typo "Villandet" → "Villadent" | |

Do not add Lombok: records and plain classes cover the need, and Lombok plus MapStruct needs an extra binding processor. The existing test starters already bring JUnit Jupiter 6, Mockito and AssertJ (through `spring-boot-starter-test`), so do not add them again. Add any other dependency only with a reason written in the commit body, and check its compatibility with Spring Boot 4.1 first (for example springdoc-openapi).

Keep what is already right: `ddl-auto=validate` (Flyway owns the schema), `open-in-view=false`, credentials from `DB_URL`/`DB_USER`/`DB_PASSWORD`, PostgreSQL 17 pinned in both Docker Compose and Testcontainers.

## 3. Architecture: hexagonal, one module per business capability

Base package: `co.edu.unipamplona.villadent`. Each module follows the layout that already exists locally for `modules/users`:

```
modules/<module>/
  domain/
    model/            Domain entities and value objects. Pure Java.
    error/            Domain exceptions (one per broken business rule).
    ports/drivers/    Input ports: one interface per use case.
    ports/drivens/    Output ports: repositories, clock, WhatsApp, token generator.
  application/
    usecases/         Implementations of the driver ports.
  infrastructure/
    adapters/input/rest/          Controllers, request and response records, web mappers.
    adapters/output/persistence/  JPA entities, Spring Data repositories, persistence mappers, adapters.
    adapters/output/<external>/   Other driven adapters (whatsapp, security...).
    config/                       Spring @Configuration: wires use cases as beans.
shared/               Cross-cutting pieces only: error handling, security config, MapStruct config, clock.
```

Modules:

| Module | Owns | Requirements |
| --- | --- | --- |
| `users` | Staff users, roles, login, JWT | RF09 |
| `dentists` | Dentists and their weekly schedules | RF03 |
| `procedures` | Procedure catalog and durations | RF04 |
| `patients` | Patients, phone validation | RF02, RF07 (one active appointment) |
| `appointments` | Availability, booking (web and manual), status changes, rescheduling, the patient's manage link | RF01, RF03, RF04, RF06, RF07, RF08 |
| `reminders` | Reminder scheduling, WhatsApp sending, retries | RF05 |
| `reports` | Monthly reports, read-only | RF10 |

Dependency rules (write them as ArchUnit tests in the first commit):

1. `domain` depends on nothing outside the JDK: no Spring, no `jakarta.persistence`, no `jakarta.validation`, no `infrastructure`, no `application`.
2. `application` depends on `domain` only, plus `org.springframework.transaction.annotation.Transactional`. Use cases are plain classes; `infrastructure/config` creates them as beans.
3. `infrastructure` may depend on everything in its own module.
4. A module uses another module only through that module's driver ports, never through its repositories, JPA entities or controllers.
5. Controllers call driver ports, never repositories. Persistence adapters implement driven ports.

Naming: domain `Appointment`, JPA `AppointmentJpaEntity`, Spring Data `AppointmentJpaRepository`, adapter `AppointmentPersistenceAdapter`, driver port `BookAppointmentUseCase`, implementation `BookAppointmentService`, controller `AppointmentController`, records `BookAppointmentRequest` and `AppointmentResponse`.

Language: Java code, comments, commits and docs in English. User-facing messages in Spanish, copied from the prototype. Database names in Spanish snake_case, as in the documented ER diagram, so the schema can be traced to the deliverable.

## 4. Domain rules to implement

Reuse these from the prototype (`Desarrollo/frontend/src/app/core/domain/`):

- **Phone**: strip non-digits, then require `^3\d{9}$`. Messages: «El número de celular es obligatorio.», «El celular debe tener 10 dígitos.», «Escribe un celular colombiano válido (empieza por 3).». Name: required, at least two words: «El nombre completo es obligatorio.», «Escribe nombre y apellido.».
- **Slots**: 30-minute grid. A slot is offered only when the whole procedure fits inside one of the dentist's schedule blocks, does not overlap an occupying appointment, and is not in the past. Default schedule: 08:00–12:00 and 14:00–18:00.
- **Occupying (active) statuses**: `PENDIENTE`, `CONFIRMADA`, `REPROGRAMADA`. `CANCELADA`, `ATENDIDA` and `NO_ASISTIO` free the slot.
- **One active appointment per patient** (by phone), dated today or later, for both web and manual booking (CP-RF07-02, CP-RF08-03).
- **Durations**: 30, 45, 60 or 90 minutes, read from the procedure; the appointment stores a copy of the duration at booking time.
- **Rescheduling** keeps the same appointment: it moves date and time and sets `REPROGRAMADA`; the old slot is freed by that move.
- **Conflict message** when a slot is taken while booking: «Este horario acaba de ser ocupado. Por favor elige otro.» (public) and «Este horario acaba de ser ocupado, elige otro.» (staff).
- **Reminders**: morning appointments (start before 12:00) get the reminder at 18:00 the day before; afternoon appointments at 08:00 the same day. Cancelled appointments get none. A failed send is recorded and retried up to 3 times, 5 minutes apart; after the third failure the reminder stays `FALLIDO` and the staff agenda shows it (decided 2026-10-22). When the reminder time has already passed at booking (for example, booking at 20:00 for 09:00 the next day, or a same-day booking), the reminder is sent right away; booking itself is never restricted by the reminder schedule (decided 2026-10-22).
- **Time zone**: `America/Bogota`. Inject a `java.time.Clock` (driven port or bean); never call `LocalDateTime.now()` without it, or CP-RF05-01 to 05 cannot be tested.

### WhatsApp integration

- Use the WhatsApp Cloud API (Meta). During the course, use only the test business number Meta creates for the app, and send only to the team's phone numbers registered as recipients.
- A reminder is a business-initiated message, so it must use an approved message template, category `UTILITY`, with the patient's name, date, time and dentist, and one URL button. Approval can take up to 24 hours: request it early in cycle 3.
- The URL button has a fixed prefix (the frontend manage page) and a variable suffix: the appointment's manage token. The patient confirms, cancels or reschedules on that page, so the backend does not need a webhook to receive WhatsApp replies.
- The driven port (for example `ReminderSender`) hides the API. The adapter calls it with `RestClient` and reads `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TEMPLATE_NAME` from the environment; none of them goes into the code or the repository.

## 5. DTOs and mapping

- **Every DTO is a Java `record`**: requests, responses, and data crossing a port when it is not a domain entity. No setters, no mutable DTO classes.
- Bean Validation annotations go on request records (`@NotBlank`, `@Pattern`, `@NotNull`) with the Spanish messages above. The domain checks its own invariants again: validation at the edge is for fast feedback, the domain is the authority.
- **MapStruct for every layer crossing**: request → command, domain → response, domain ↔ JPA entity. One shared config in `shared`:
  ```java
  @MapperConfig(componentModel = MappingConstants.ComponentModel.SPRING,
                injectionStrategy = InjectionStrategy.CONSTRUCTOR,
                unmappedTargetPolicy = ReportingPolicy.ERROR)
  public interface CentralMapperConfig {}
  ```
  Every mapper uses `@Mapper(config = CentralMapperConfig.class)`. `ReportingPolicy.ERROR` makes a forgotten field fail the build.
- Mappers live in `infrastructure` (web mappers next to controllers, persistence mappers next to adapters), never in `domain`.
- Domain entities with invariants expose a factory for new objects (`Appointment.book(...)`, which validates) and a constructor for rebuilding from storage that MapStruct uses. Mark it with an annotation named `@Default` when there is more than one constructor.
- Never return a JPA entity from a controller, and never let a domain object carry JPA annotations.

## 6. Database

Flyway owns the schema: `src/main/resources/db/migration/V<n>__<description>.sql`. Never edit a migration that has already been merged; add a new one. Hibernate validates against it (`ddl-auto=validate`).

Base: the ER diagram in Actividad 3 (`roles`, `usuarios`, `odontologos`, `pacientes`, `citas`, `recordatorios`). The requirements need these additions, which are marked **new**:

| Table | Columns and constraints |
| --- | --- |
| `roles` | `id_rol` PK, `nombre_rol` unique. Seeded with `AUXILIAR`, `ODONTOLOGO`. |
| `usuarios` | `id_usuario` PK, `nombre`, `correo` unique, `password_hash` (bcrypt), `id_rol` FK, `activo`, `creado_en`, `actualizado_en`. |
| `odontologos` | `id_odontologo` PK, `nombre`, `especialidad`, `id_usuario` FK unique and nullable (a dentist may have no login), `activo`, timestamps. |
| `horarios_odontologo` **new** | `id_horario` PK, `id_odontologo` FK, `dia_semana` (1–7), `hora_inicio`, `hora_fin` (check `hora_fin > hora_inicio`), `activo`. RF03, and CP-RF01-02 (a day with no schedule). |
| `procedimientos` **new** | `id_procedimiento` PK, `nombre` unique, `duracion_min` (check in 30, 45, 60, 90), `activo`, timestamps. RF04 asks for configurable durations; the diagram had a free-text `tipo_procedimiento`. |
| `pacientes` | `id_paciente` PK, `nombre_completo`, `telefono` unique (check `^3[0-9]{9}$`), `activo`, timestamps. |
| `citas` | `id_cita` PK, `codigo` unique (`VD-####`) **new**, `id_paciente` FK, `id_odontologo` FK, `id_procedimiento` FK **new** (replaces `tipo_procedimiento`), `fecha`, `hora`, `duracion_min`, `estado` (check in the six statuses), `origen` (`WEB`, `MANUAL`) **new**, `token_gestion_hash` unique **new** (SHA-256 of the manage link token, never the token itself), `version` **new** (optimistic locking), timestamps. |
| `recordatorios` | `id_recordatorio` PK, `id_cita` FK, `canal` (`WHATSAPP`), `programado_para` **new**, `fecha_envio` nullable, `estado_envio` (`PROGRAMADO`, `ENVIADO`, `FALLIDO`), `intentos` **new**, `ultimo_error` **new**, timestamps. |

All timestamps are `timestamptz`. Every foreign key is `ON DELETE RESTRICT`.

**No double booking, enforced by the database** (CP-RF07-03, CP-RF08-02). An in-memory check alone loses the race between two simultaneous requests:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE citas ADD CONSTRAINT citas_sin_cruce EXCLUDE USING gist (
  id_odontologo WITH =,
  tsrange(fecha + hora, fecha + hora + make_interval(mins => duracion_min)) WITH &&
) WHERE (estado IN ('PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'));
```

The persistence adapter turns SQL state `23P01` into a domain `SlotTakenException`, which the API returns as `409`. The one-active-appointment rule depends on today's date, so it cannot be a plain index: check it in the use case after locking the patient row (`SELECT ... FOR UPDATE`).

The new tables and columns extend the documented diagram. When the first migration that adds them is merged, update the diagram in Actividad 3 and record the change in the change-control table (root `CLAUDE.md`).

## 7. Never delete: activate and deactivate

- **No physical deletes**, in code or in SQL. Driven ports have no `delete` methods, controllers have no `DELETE` endpoints, and no JPA mapping uses `CascadeType.REMOVE` or `orphanRemoval`.
- Catalog and people tables (`usuarios`, `odontologos`, `horarios_odontologo`, `procedimientos`, `pacientes`) have `activo boolean not null default true`. They change through `PATCH /api/v1/<resource>/{id}/activar` and `/desactivar`, which are idempotent and update `actualizado_en`.
- Inactive records disappear from public lists and availability, cannot receive new appointments, and still show in history and reports. A deactivated user cannot sign in.
- **Appointments are never deactivated or deleted**: their life is the status (`CANCELADA`, `ATENDIDA`, `NO_ASISTIO`). Reminders are an append-only log.
- Deactivating a dentist with future active appointments is rejected (409) with the count of affected appointments. Staff reschedule or cancel them first.
- Unique values stay unique across active and inactive rows: reactivate the existing record instead of creating a duplicate.

## 8. Security

- Staff log in with `POST /api/v1/auth/login` (email and password) and receive a JWT signed with HS256, using a secret from the `JWT_SECRET` environment variable (at least 32 bytes), with the role as a claim and an 8-hour expiry. Validate it with the OAuth2 resource server; issue it with `NimbusJwtEncoder`.
- Passwords: `BCryptPasswordEncoder`. Never log credentials, tokens or patient phone numbers.
- No session or JWT → `401` (CP-RF09-04). Wrong role → `403` (CP-RF09-03). Both as `ProblemDetail`.
- **Patient manage link**: 32 random bytes from `SecureRandom`, encoded as base64url and sent in the reminder; only its SHA-256 hash is stored. An unknown or altered token returns `404` with no data at all (CP-RF06-05). It works only while the appointment is active and in the future.
- CORS: allow only the frontend origin from configuration (`http://localhost:4200` in development).
- Public responses never include other patients' names or phones (CP-RNF03-02).

## 9. API conventions

Prefix `/api/v1`. JSON in camelCase, dates as ISO 8601 (`2026-10-22`, `14:30`).

| Access | Endpoints |
| --- | --- |
| Public | `GET /public/dentists`, `GET /public/procedures`, `GET /public/availability?dentistId&procedureId&date`, `POST /public/appointments`, `GET /public/appointments/manage/{token}`, `POST /public/appointments/manage/{token}/confirm`, `/cancel`, `/reschedule` |
| Staff, both roles | `POST /auth/login`, `GET /appointments?dentistId&date` (a dentist sees only their own agenda) |
| `AUXILIAR` only | `POST /appointments` (manual), `PATCH /appointments/{id}/status`, `POST /appointments/{id}/reschedule`, `GET /reports?from&to&dentistId`, managing dentists, schedules, procedures and users, including activate and deactivate |

Decided (2026-10-22): catalog management (dentists, schedules, procedures, users) belongs to the administrative role, `AUXILIAR`.

Errors: one `@RestControllerAdvice` in `shared` maps domain exceptions to RFC 9457 `ProblemDetail`, with the Spanish message in `detail` and a stable `code` property (for example `SLOT_TAKEN`, `ACTIVE_APPOINTMENT_EXISTS`). Status codes: `400` validation, `401`, `403`, `404`, `409` business conflicts. Never return a stack trace.

Lists that can grow (appointments, reports) take `page` and `size`. Reports must answer in under 5 seconds (CP-RF10-01), and agenda reads in under 2 seconds with 15 appointments a day (RNF04): add indexes on `citas (id_odontologo, fecha)` and `citas (id_paciente)`.

## 10. Tests

Follow the test plan through the root `CLAUDE.md`. In short:

- Write the test first, named with the case ID: `@DisplayName("CP-RF03-02: rejects an overlapping appointment")`.
- **Unit** (`U`): domain and use cases with JUnit Jupiter, Mockito for driven ports, a fixed `Clock`. No Spring context.
- **Integration** (`I`): `@SpringBootTest` or `@WebMvcTest` with MockMvc, against PostgreSQL through the existing `TestcontainersConfiguration`. Never H2: the exclusion constraint and `23P01` only exist in PostgreSQL.
- **Architecture**: ArchUnit tests for the rules in section 3, plus a test that fails if any driven port declares a method starting with `delete`.
- **Concurrency**: CP-RF07-03 and CP-RF08-02 fire two bookings in parallel against Testcontainers and assert that exactly one is saved.
- **WhatsApp**: behind a driven port; tests use a fake. The real client runs only in the test environment with team phone numbers.
- Every test builds its own data; use only fictitious patients.

## 11. Current state and order of work

Updated 2026-10-23. Follow the cycles of the test plan (section 10 of the plan). Each step is one or more small commits (Conventional Commits, no `Co-Authored-By` lines), each with its code, tests and docs together. Work on branch `feature/cycle-1` (created from `feature/backend-foundation`; nothing of the backend is pushed yet).

### Step 0 — foundation: done

| Commit | What |
| --- | --- |
| `bc376ad` | Spring Boot 4.1.2 release, MapStruct 1.6.3, ArchUnit 1.5.1, JaCoCo, Actuator |
| `35f6b27` | `shared/error`: `DomainException` and `ProblemDetailAdvice` (RFC 9457) |
| `97661fc` | `shared/security/SecurityConfig`: JWT HS256 encoder and decoder, public paths, everything else authenticated |
| `51acf64` | `ArchitectureTest` with the three layer rules |
| `22fd075` | `V1__initial_schema.sql`: every table of section 6, `citas_sin_cruce`, seeded roles |
| `ea74980` | `shared/clock/ClockConfig` (`America/Bogota`) and `shared/config/CentralMapperConfig` |
| `ed00b40` | Security fix: `dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()`, so a 404 or 500 on a public path is no longer turned into 401; `SecurityConfigServerTest` against the real server |

The suite has 14 tests in 7 classes, all green. Production code holds only `shared/` and the main class: **no module, controller, use case or port exists yet**, and no requirement RF01–RF10 is implemented.

### Step 0.5 — fixes before cycle 1 (do these first, in this order)

1. **Commit the pending test changes** already in the working tree: `ArchitectureTest` (the `applicationDependsOnlyOnDomain` rule was inverted and is now fixed; the class now analyzes production code only), `ArchitectureRulesTest` and the fixtures in `src/test/java/co/edu/unipamplona/villadent/archfixture/`. Message: `test(backend): fix the inverted application layer rule and test it with fixtures`.
2. **Test the other two ArchUnit rules with fixtures**, the way `ArchitectureRulesTest` does: a domain fixture that imports a Spring class must be rejected by `domainHasNoFrameworkDependencies`, and a driven-port fixture with a `delete...` method must be rejected by `drivenPortsAreAppendOnly`. Today both rules pass without checking a single class.
3. **Fix V1 instead of adding V2.** V1 was never pushed or merged, so editing it is allowed this one time:
   - Primary keys are `SERIAL` (32-bit) while foreign keys are `BIGINT`. Change every primary key to `BIGINT GENERATED ALWAYS AS IDENTITY`, so JPA entities can use `Long` ids. With `ddl-auto=validate`, the first entity with a `Long` id would fail at startup otherwise.
   - Add the indexes of section 9: `citas (id_odontologo, fecha)` and `citas (id_paciente)`.
   - Then reset the local dev database, which already applied the old V1: `docker compose down -v` in `Desarrollo/backend`. Tests use fresh Testcontainers databases and are not affected.
4. **Fix the JaCoCo rule** in `build.gradle`: with `element = 'PACKAGE'`, `includes` matches exact package names, so `...modules.reminders` would never match the code in `...modules.reminders.domain`. Use wildcards (`co.edu.unipamplona.villadent.modules.appointments.domain*` and `co.edu.unipamplona.villadent.modules.reminders*`) and check that the rule measures something once those packages exist.

### Before cycle 1 — ask the user (do not decide alone)

- How the first `AUXILIAR` account is created, since only an `AUXILIAR` can create users (for example a Flyway seed with a bcrypt hash and credentials passed through environment variables, or a bootstrap from environment variables at startup).
- Whether development needs demo data (dentists, schedules, procedures) and how to load it without mixing it into production migrations.

### Cycle 1 — RF09, RF02, RF01, RF03

Modules `users`, `dentists`, `procedures`, `patients`, and the availability part of `appointments`.

- **RF09:** login with JWT, role rules in `SecurityConfig`, CORS for the frontend origin. Cases CP-RF09-01 (I), CP-RF09-02 (U), CP-RF09-03 (I: `ODONTOLOGO` → reports → 403), CP-RF09-04 (I, already covered). Also CP-RNF03-01 (I: passwords stored as bcrypt hashes).
- **Catalogs:** dentists, weekly schedules, procedures and staff users, managed by `AUXILIAR`, with activate and deactivate (section 7).
- **RF02:** patient validation and storage. Cases CP-RF02-01 (U, I), CP-RF02-02 (U), CP-RF02-03 (U).
- **RF01 and RF03:** public availability. Cases CP-RF01-01 (I), CP-RF03-01 (I), the domain part of CP-RF03-02 (U: overlapping slot rejected), and CP-RNF03-02 (I: public responses carry no patient data).
- **Harden the placeholder security tests** in the same commits:
  - `loginPathIsNotBlockedBySecurity` only asserts "not 401". Replace it with a valid login → 200 and a wrong password → 401.
  - `publicPathWithoutHandlerIsNotFound` and `publicPathsArePermitted` call `/api/v1/public/dentists` and expect 404. They break once that endpoint exists: point them at a public path that does not exist (the 404-not-401 regression must keep a test) and add a real 200 test for the endpoint.

### Cycle 2 — RF04, RF07, RF08

- **RF04:** durations from the procedure. Cases CP-RF04-01 to CP-RF04-05.
- **RF07:** public booking, one active appointment per phone, concurrency. Cases CP-RF07-02 (U), CP-RF07-03 (I: two parallel bookings against Testcontainers, exactly one saved).
- **RF08:** manual booking by `AUXILIAR`. Cases CP-RF08-01 (I), CP-RF08-02 (I: concurrency), CP-RF08-03 (U).
- Cases that need booking and cancelling, left over from cycle 1: CP-RF01-03 (I: cancelling frees the slot), and the integration part of CP-RF03-02.
- **Harden `ProblemDetailAdviceTest`** with the real exceptions (`SlotTakenException` → 409 `SLOT_TAKEN`, active appointment → 409), with the exact Spanish messages.

### Cycle 3 — RF05, RF06

- **RF05:** reminder scheduling with the injected clock, sending immediately when the reminder time already passed, 3 retries 5 minutes apart. Cases CP-RF05-01 to CP-RF05-06. Request the WhatsApp template approval at the start of the cycle (it can take 24 hours).
- **RF06:** manage link (confirm, cancel, reschedule). Cases CP-RF06-01 to CP-RF06-06. The manual (`M`) parts are run by QA.

### Cycle 4 — RF10 and closing

- **RF10:** reports. Cases CP-RF10-01 to CP-RF10-04 (including the 5-second limit).
- Run `./gradlew check` (it includes the JaCoCo 70 % branch check) and fix any gap.

### Not for the backend agent

- **E2E cases** (Playwright) need the frontend connected to the backend; they are a separate task.
- **Manual cases** (`M`): CP-RNF01-01, CP-RNF02-01, CP-RNF04-01 and the `M` parts of RF06 are run by QA.
- **The test plan's matrix and results report** (sections 13 and 14) are filled by QA. Do not edit them.

## 12. Definition of done

A change is done when:

- [ ] Its test cases from the plan exist, carry the `CP-` ID, and pass (`./gradlew test`).
- [ ] The ArchUnit tests pass: no layer or module boundary is broken.
- [ ] No physical delete was added, and every new catalog table has `activo`.
- [ ] Every DTO is a record and every layer crossing goes through a MapStruct mapper with `ReportingPolicy.ERROR`.
- [ ] Schema changes are a new Flyway migration, and the app starts with `ddl-auto=validate`.
- [ ] User-facing messages are in Spanish and match the prototype and the test plan.
- [ ] The backend README is updated if commands, variables or endpoints changed.
- [ ] If it changes scope, requirements or the data model, it is recorded in the change-control table.

## 13. Do not

- Delete rows, or add `DELETE` endpoints or `delete` port methods.
- Put Spring, JPA or validation annotations in `domain`.
- Return JPA entities or domain objects from controllers.
- Write a mapper by hand where MapStruct can do it, or use classes with setters for DTOs.
- Let Hibernate create or alter the schema.
- Read the system clock directly.
- Add a patient login or a patient role.
- Store the manage link token, passwords or secrets in plain text, or commit them.
- Use H2 or mocks of the database in integration tests.
- Change the test plan's expected results to fit the code: if they disagree, stop and ask.
