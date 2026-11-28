# Especificación técnica: SaaS multi-clínica (Villadent AgendaPro → agendamiento odontológico genérico)

Estado: borrador para revisión del equipo · Fecha: 2026-11-28 · Línea base: `origin/main` @ `66fca8f`

Objetivo: convertir la aplicación de una sola clínica (Centro Odontológico Villadent) en un único despliegue que atienda a muchas clínicas odontológicas. Cada clínica tiene sus propios datos, configuración, marca y número de WhatsApp. Villadent pasa a ser la primera clínica (tenant) y su comportamiento no debe cambiar.

Tareas de implementación, divididas para dos desarrolladores:
- [`saas-tareas-dev-a-backend.md`](saas-tareas-dev-a-backend.md): núcleo de backend (datos, aislamiento, seguridad, reglas de dominio).
- [`saas-tareas-dev-b-frontend-integraciones.md`](saas-tareas-dev-b-frontend-integraciones.md): frontend, WhatsApp, reportes, infraestructura y E2E.

> Esto es un cambio de alcance y de requisitos. Según el `CLAUDE.md` raíz, nada de esta especificación se implementa hasta que existan dos cosas: (a) casos de prueba nuevos en el plan de pruebas (`Documentacion/pruebas/Actividad módulo 2_Plan de pruebas.docx`) y (b) una fila en la tabla de control de cambios. Hoy el plan **no tiene ningún caso** de multi-tenencia. La sección 10 propone los casos; QA o el equipo debe agregarlos al plan.

---

## 1. Alcance

**Dentro del alcance**
- Modelo de clínica (tenant) y aislamiento de todas las tablas de negocio.
- Resolución de la clínica para el tráfico público y el del personal.
- Configuración por clínica: identidad, contacto, horario de atención, zona horaria, horas de recordatorio, marca y textos legales.
- Credenciales de WhatsApp Cloud API por clínica y enrutamiento de los mensajes entrantes.
- Rol de administrador de plataforma y alta de clínicas (crear, activar, desactivar).
- Carga de la configuración de la clínica en el frontend en tiempo de ejecución, no como constantes compiladas.
- Nombre de producto neutro.

**Fuera del alcance (fases posteriores)**
- Facturación, planes y pasarela de pago (solo se reserva una columna `plan`).
- Un CMS. Según la evaluación previa, un CMS añade un segundo runtime, una segunda base de datos y un segundo sistema de autenticación, y no cubre el núcleo transaccional. El contenido de marketing sale de la configuración de la clínica. Un CMS headless solo se reconsideraría para un sitio de marketing o un blog.
- Registro autoservicio de clínicas (el alta la hace el administrador de plataforma).
- Cuentas de paciente. Se mantiene la decisión 1.3: el paciente nunca inicia sesión.

---

## 2. Línea base (estado actual, local y remoto)

| Elemento | Estado |
|---|---|
| Rama de integración | `origin/main` @ `66fca8f` (PR #21 mergeado el 2026-11-28 a las 01:51 UTC). Migraciones V1–V9. |
| Rama local `feat/whatsapp-phone-verification` | 5 commits **que no están en main** (`53fe383`…`611c0a5`). Rediseñan la verificación para que *el paciente envíe* el código (webhook entrante) y **editan `V9__phone_verifications.sql`**. Su PR ya se mergeó, así que según el flujo de git no se puede subir nada más a esa rama. |
| Verificación en main | Saliente: `WhatsAppVerificationSender` envía una plantilla de autenticación de Meta (`app.whatsapp.verification-template-name`) y el paciente escribe el código. |
| Stack | Angular 22 + Tailwind 4 (Vercel), Spring Boot 4.1.2 (Hibernate 7), PostgreSQL 17, Flyway, Testcontainers, Playwright. |

**Decisión previa D0 (bloqueante):** el equipo elige un diseño de verificación: el saliente de main o el entrante de la rama local. Si gana el entrante, debe entrar como una migración **nueva** (`V10+`) en una rama nueva desde `main`, nunca editando V9. Esta especificación está escrita sobre main e indica dónde difiere el diseño entrante (§5.6).

### 2.1 Acoplamiento a una sola clínica

| Capa | Acoplamiento | Evidencia |
|---|---|---|
| Esquema | Ninguna tabla tiene columna de clínica. Unicidades globales: `usuarios.correo`, `procedimientos.nombre`, `pacientes.telefono`, `citas.codigo` (secuencia global `citas_codigo_seq`), índice de reportes recientes. | `V1:16,50,61,70`, `V2:4`, `V6:11` |
| Esquema | CHECK de celular solo colombiano: `^3[0-9]{9}$`. | `V1:65` |
| Datos | El horario de la clínica está grabado en los horarios de los odontólogos. | `V7` |
| Dominio | `ClinicHours`: lunes a viernes 08–12 y 14–18, domingo 08–13, sábado cerrado. | `modules/dentists/domain/model/ClinicHours.java:23-27`, usado por `Schedule.java:28` |
| Dominio | Recordatorios fijos: 18:00 del día anterior y 08:00 del mismo día. | `modules/reminders/domain/model/ReminderSchedule.java:7-12` |
| Infraestructura | Zona horaria única `America/Bogota`. | `shared/clock/ClockConfig.java:11` |
| Infraestructura | Un solo token, phone-number-id, juego de plantillas y número de negocio de WhatsApp. | `ReminderConfig.java:37-40`, `VerificationConfig`, `application.properties` |
| Infraestructura | Una sola base para el enlace de gestión (`app.manage-link-base`) y un solo origen CORS. | `ReminderConfig.java:48`, `SecurityConfig.java:75-87` |
| Seguridad | El JWT trae `role`, `name` y `userId`, sin clínica. Emisor `villadent-agendapro`. Los controladores leen `jwt.getClaim("userId")` directamente. | `JwtTokenGeneratorAdapter.java:33-41`; `AppointmentController`, `StaffController`, `ReportController`, `DentistProfileController` |
| Reportes | Texto "Villadent" y logo en la plantilla del PDF. | `templates/appointment-report.html:4,39-40`, `HtmlReportPdfRenderer.java:28` |
| Frontend | Constante `CLINIC` y franjas de atención. | `src/app/core/config/clinic.ts:5-38` |
| Frontend | Consumidores de `CLINIC`. | `whatsapp-bubble.ts`, `public-header.ts` (también `PUBLIC_WHATSAPP_URL`), `privacy-page.ts`, `booking-flow.ts` |
| Frontend | Consumidores de `shiftsForDate`. | `core/domain/availability.ts`, `day-agenda.ts`, `landing-page.ts` |
| Frontend | Recursos de marca. | `public/brand/*`, `shared/ui/logo.ts`, `index.html:5-6,27-29` |
| Frontend | Claves de almacenamiento. | `villadent-theme` (`theme.ts:13`, script en línea de `index.html:19`); `villadent-sesion` (`app-store.service.ts:19`) |
| Frontend | La CSP solo está en `vercel.json`, con hashes de los scripts en línea (`scripts/check-csp-hash.mjs`). La API se llama por la ruta relativa `/api/v1` y un rewrite de Vercel. | `vercel.json` |
| Paquete | `co.edu.unipamplona.villadent`. Se mantiene: renombrarlo no aporta funcionalidad y tocaría todos los archivos. | — |

---

## 3. Decisiones de arquitectura

| ID | Decisión | Justificación | Alternativa descartada |
|---|---|---|---|
| AD1 | **Esquema compartido con columna discriminadora `id_clinica`** en cada tabla que pertenece a una clínica. | Un solo historial de Flyway. Permite reportes de plataforma entre clínicas. Es lo más barato para pocas clínicas. | Esquema por clínica (N ejecuciones de Flyway, pool de conexiones más difícil); base de datos por clínica (costo). |
| AD2 | **Dos capas de aislamiento:** `@TenantId` de Hibernate 7 en las entidades JPA (filtra y asigna la clínica automáticamente) **más** Row Level Security de PostgreSQL con `current_setting('app.clinic_id')`. | `@TenantId` cubre las consultas del ORM. RLS bloquea además las consultas nativas y los errores humanos. | Solo filtro en la aplicación: un `WHERE` olvidado filtra datos entre clínicas. |
| AD3 | **Resolución de la clínica según el punto de entrada:** <ul><li>Personal: claim `clinicId` del JWT.</li><li>Público: host de la petición (`{slug}.<dominio-plataforma>` o un dominio propio verificado). El frontend lo envía a la API como `X-Clinic-Slug` y el servidor lo valida contra la lista de hosts permitidos.</li><li>Enlace de gestión: la clínica sale de la fila de la cita.</li><li>Webhooks: `metadata.phone_number_id`.</li></ul> | Cada punto de entrada tiene una fuente de verdad que no se puede falsificar. | Prefijo de ruta `/c/{slug}` (URLs peores; choca con la ruta existente `/cita/`). |
| AD4 | **Un usuario pertenece a una sola clínica** (`usuarios.id_clinica`). El correo es único por clínica. Los administradores de plataforma tienen `id_clinica = NULL` y rol `PLATAFORMA`. | Coincide con los roles actuales. Evita por ahora una tabla de membresías. | Membresías muchos a muchos (se pospone hasta que un odontólogo trabaje en dos clínicas). |
| AD5 | **La configuración de la clínica vive en el backend** (módulo nuevo `clinics`) y se entrega al frontend como JSON público. Sin CMS. | Ver §1. | CMS headless. |
| AD6 | **Credenciales de WhatsApp por clínica**, cifradas (AES-GCM, llave en la variable de entorno `APP_CREDENTIALS_KEY`). La plataforma opera como Tech Provider de Meta con Embedded Signup, así cada clínica conecta su propia cuenta de WhatsApp Business (WABA) y su número. Mientras eso no exista, el administrador de plataforma ingresa las credenciales. | Los mensajes deben salir del número de la clínica. Los precios y la calidad de Meta se miden por WABA. | Un solo número compartido de la plataforma (el paciente vería un remitente que no es su clínica). |

---

## 4. Modelo de datos (Flyway)

Toma los números de versión del `origin/main` más reciente **en el momento del commit**: los `V10…V13` de abajo son provisionales. Nunca edites V1–V9. Para evitar colisiones, **solo el Desarrollador A crea migraciones** (ver archivos de tareas).

### 4.1 `V10__clinics.sql`: tabla de clínicas y configuración

```sql
CREATE TABLE clinicas (
    id_clinica      BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(63) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
    nombre          VARCHAR(150) NOT NULL,
    nombre_corto    VARCHAR(60)  NOT NULL,
    direccion       VARCHAR(255),
    telefono        VARCHAR(20),
    zona_horaria    VARCHAR(64)  NOT NULL DEFAULT 'America/Bogota',
    codigo_pais     VARCHAR(4)   NOT NULL DEFAULT '57',
    prefijo_cita    VARCHAR(6)   NOT NULL DEFAULT 'VD',
    siguiente_cita  INTEGER      NOT NULL DEFAULT 1001,
    plan            VARCHAR(20)  NOT NULL DEFAULT 'BASICO',
    activa          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE dominios_clinica (            -- dominios propios, verificados por el administrador de plataforma
    dominio     VARCHAR(253) PRIMARY KEY,
    id_clinica  BIGINT NOT NULL REFERENCES clinicas ON DELETE RESTRICT,
    verificado  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE horarios_clinica (            -- reemplaza ClinicHours y la parte de clínica de V7
    id_horario   BIGSERIAL PRIMARY KEY,
    id_clinica   BIGINT NOT NULL REFERENCES clinicas ON DELETE RESTRICT,
    dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    nombre_turno VARCHAR(30) NOT NULL,
    hora_inicio  TIME NOT NULL,
    hora_fin     TIME NOT NULL CHECK (hora_fin > hora_inicio),
    activo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE configuracion_clinica (
    id_clinica             BIGINT PRIMARY KEY REFERENCES clinicas ON DELETE RESTRICT,
    logo_url               VARCHAR(500),
    logo_oscuro_url        VARCHAR(500),
    color_primario         VARCHAR(7)  CHECK (color_primario ~ '^#[0-9a-fA-F]{6}$'),
    descripcion_sitio      VARCHAR(300),
    politica_privacidad    TEXT,          -- Markdown; se renderiza sanitizado
    recordatorio_dia_antes TIME NOT NULL DEFAULT '18:00',
    recordatorio_mismo_dia TIME NOT NULL DEFAULT '08:00'
);

CREATE TABLE credenciales_whatsapp (
    id_clinica                BIGINT PRIMARY KEY REFERENCES clinicas ON DELETE RESTRICT,
    phone_number_id           VARCHAR(40) NOT NULL UNIQUE,   -- llave para enrutar los entrantes
    numero_negocio            VARCHAR(20) NOT NULL,
    token_cifrado             BYTEA NOT NULL,
    plantilla_recordatorio    VARCHAR(100) NOT NULL,
    plantilla_verificacion    VARCHAR(100),
    idioma_plantilla          VARCHAR(10) NOT NULL DEFAULT 'es',
    activo                    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Clínica 1 = Villadent con los valores exactos de hoy, para que nada cambie.
INSERT INTO clinicas (id_clinica, slug, nombre, nombre_corto, direccion, telefono, prefijo_cita)
VALUES (1, 'villadent', 'Centro Odontológico Villadent', 'Villadent',
        'Cra. 10 #21-14, Villa Del Rosario, Norte de Santander, Colombia', '+57 314 4223133', 'VD');
-- + filas de horarios_clinica iguales a ClinicHours; fila de configuracion_clinica con el logo actual;
--   siguiente_cita de la clínica 1 = siguiente valor de citas_codigo_seq.
SELECT setval('clinicas_id_clinica_seq', 1);
```

Las credenciales de WhatsApp de la clínica 1 **no** se cargan en SQL, porque los secretos no van en migraciones. Al arrancar, un proceso copia los valores `app.whatsapp.*` del entorno a `credenciales_whatsapp` si falta la fila de la clínica 1 (§5.6).

### 4.2 `V11__tenant_columns.sql`: `id_clinica` en las tablas de cada clínica

Tablas: `usuarios`, `odontologos`, `horarios_odontologo`, `procedimientos`, `procedimiento_odontologos`, `pacientes`, `citas`, `recordatorios`, `reportes_generados`, `codigos_verificacion`, `tokens_verificacion`. La tabla `roles` sigue siendo global; se agrega el rol `PLATAFORMA`.

Para cada tabla, en una sola migración:
1. `ADD COLUMN id_clinica BIGINT`.
2. `UPDATE … SET id_clinica = 1`.
3. `ALTER … SET NOT NULL`. La excepción es `usuarios`, donde la columna admite nulo solo para el rol `PLATAFORMA`, controlado con un CHECK.
4. Llave foránea a `clinicas` con `ON DELETE RESTRICT`.

Después se reconstruyen las unicidades y los índices:

| Antes | Después |
|---|---|
| `usuarios.correo` UNIQUE | `UNIQUE (id_clinica, correo)` + único parcial sobre `correo WHERE id_clinica IS NULL` |
| `procedimientos.nombre` UNIQUE | `UNIQUE (id_clinica, nombre)` |
| `pacientes.telefono` UNIQUE | `UNIQUE (id_clinica, telefono)` |
| `citas.codigo` UNIQUE | `UNIQUE (id_clinica, codigo)`; el código se genera por clínica (§5.4) |
| `citas_odontologo_fecha_idx`, `citas_fecha_idx`, `citas_paciente_idx` | con prefijo `id_clinica` |
| `recordatorios_pendientes_idx` | sin cambios: el programador sigue siendo global (§5.5) |
| `reportes_generados (generado_en DESC, id DESC)` | `(id_clinica, generado_en DESC, id DESC)` |
| verificación `(telefono, creado_en)`, `(ip_cliente, creado_en)` | con prefijo `id_clinica`. Los límites pasan a ser por clínica; el límite por IP se mantiene también global como protección contra abuso. |

**Integridad dentro de la misma clínica.** Se agrega `UNIQUE (id_clinica, id_x)` en las tablas padre. Luego las llaves foráneas de las hijas se reemplazan por llaves compuestas: `(id_clinica, id_odontologo) → odontologos (id_clinica, id_odontologo)`, y lo mismo para paciente, procedimiento y cita. Así la base de datos impide que una cita de la clínica A apunte a un odontólogo de la clínica B.

La restricción de exclusión `citas_sin_cruce` (V1:114-118) **no cambia**: está definida por `id_odontologo`, y cada odontólogo pertenece a una sola clínica. CP-RF07-03 y CP-RF08-02 conservan su garantía.

El CHECK de celular `^3[0-9]{9}$` pasa al dominio, parametrizado por `clinicas.codigo_pais`. Se elimina de la base de datos solo cuando llegue una clínica de otro país (decisión abierta D4).

### 4.3 `V12__row_level_security.sql`

```sql
-- Para cada tabla t que pertenece a una clínica:
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
ALTER TABLE t FORCE ROW LEVEL SECURITY;
CREATE POLICY t_tenant ON t
  USING      (id_clinica = current_setting('app.clinic_id', true)::bigint)
  WITH CHECK (id_clinica = current_setting('app.clinic_id', true)::bigint);
```

- La aplicación se conecta con un rol que no es dueño de las tablas, `agendapro_app`, sin `BYPASSRLS`. Flyway corre con el rol dueño.
- Los procesos de plataforma (programador de recordatorios, administrador de plataforma) usan otro rol, `agendapro_platform`, con `BYPASSRLS`. Lo hacen a través de un segundo `DataSource` que usan **solo** esos adaptadores.
- `app.clinic_id` se fija en cada transacción con `SET LOCAL` (§5.2). Si no está fijado, `current_setting(..., true)` devuelve NULL y **no se ve ninguna fila**: el sistema falla cerrado.

### 4.4 Migración de limpieza (cuando el código ya no use lo anterior)

- `horarios_odontologo` deja de representar el horario de la clínica: queda solo como disponibilidad del odontólogo, validada contra `horarios_clinica`.
- Se elimina la secuencia global `citas_codigo_seq` cuando los códigos por clínica ya estén en producción.

---

## 5. Backend

### 5.1 Módulo nuevo `modules/clinics`

Sigue `backend/docs/development-prompt.md`: dominio puro, casos de uso conectados en `ClinicConfig` y reglas de ArchUnit.

- `domain/model`: `Clinic`, `ClinicSlug`, `ClinicSchedule` (reemplaza `ClinicHours` con el mismo contrato `validate(day, start, end)`), `ClinicBranding`, `ReminderTimes`, `WhatsAppCredentials`.
- Puertos driver:
  - `FindClinicBySlugUseCase`, `FindClinicByHostUseCase`
  - `GetPublicClinicProfileUseCase`
  - `GetClinicScheduleUseCase`, `GetClinicReminderTimesUseCase`, `GetClinicWhatsAppCredentialsUseCase`
  - `ProvisionClinicUseCase`, `SetClinicActiveUseCase`, `UpdateClinicSettingsUseCase`
- Puertos driven: `ClinicRepository`, `CredentialCipher`.
- Web: los endpoints de §6.0.
- Siguen prohibidos los borrados físicos (solo activar o desactivar), según el §7 del development prompt.

### 5.2 Contexto de clínica (`shared/tenancy`)

- `TenantContext`: guarda el `ClinicId` de la petición (ScopedValue o ThreadLocal, limpiado en `finally`).
- `TenantResolutionFilter`, que corre después de la autenticación JWT:
  - Petición autenticada: `clinicId` sale del JWT. Si llega `X-Clinic-Slug` y no coincide, responde 403.
  - Petición pública: la clínica se resuelve con `Host` / `X-Clinic-Slug` contra la lista permitida. Si es desconocida o está inactiva, responde 404 ProblemDetail con `code=clinic_not_found`.
  - `/api/v1/platform/**`: sin clínica; exige rol `PLATAFORMA`.
  - Webhook: sin clínica en el filtro; se resuelve dentro del manejador (§5.6).
- Hibernate: un `CurrentTenantIdentifierResolver` lee `TenantContext`, y las entidades anotan `@TenantId Long clinicId`.
- Enlace con RLS: un `ConnectionPreparer` o listener de transacción ejecuta `SELECT set_config('app.clinic_id', ?, true)` al iniciar cada transacción. Se prueba unitariamente con un fake y en integración con Testcontainers (§10).
- Abstracción `CurrentUser` (`shared/security`) con `userId()`, `role()` y `clinicId()`, construida desde el JWT. Reemplaza las llamadas directas a `jwt.getClaim("userId")` en `AppointmentController`, `StaffController`, `ReportController` y `DentistProfileController`.

### 5.3 Cambios de seguridad (`SecurityConfig`, `JwtTokenGeneratorAdapter`)

- **JWT:** nuevo claim `clinicId` (nulo para PLATAFORMA) y emisor `agendapro`. Los tokens emitidos antes del cambio no traen `clinicId`, así que se rechazan y el usuario vuelve a iniciar sesión. Es aceptable porque duran 8 h.
- **Login:** como el correo es único por clínica, primero se resuelve la clínica (host o slug) y luego se busca `(id_clinica, correo)`. El administrador de plataforma inicia sesión en el host de la plataforma.
- **Rutas:** se agrega `/api/v1/platform/**` → `ROLE_PLATAFORMA` y las demás reglas quedan iguales. Los casos CP de 401 y 403 deben seguir pasando.
- **CORS:** el origen único `app.cors.allowed-origin` se reemplaza por patrones (`https://*.<dominio-plataforma>`) más los dominios propios verificados de `dominios_clinica`, mediante un `CorsConfigurationSource` con caché.
- **Administrador inicial** (`BootstrapAdminConfiguration`): crea el administrador de plataforma. El auxiliar de Villadent queda como está, en la clínica 1.

### 5.4 Reglas de dominio que pasan a ser por clínica

| Regla | Hoy | Cambio |
|---|---|---|
| Horario de atención | Constantes de `ClinicHours` | `ClinicSchedule` cargado con `GetClinicScheduleUseCase`. `Schedule.validate` lo recibe como argumento, así el dominio sigue puro. |
| Zona horaria | `ClockConfig.ZONE` | `Clinic.zoneId()`. El bean `Clock` queda en UTC. Toda conversión de `fecha+hora` a `Instant` (`ReminderPersistenceMapper:36,40`, `ReminderPersistenceAdapter:45`) usa la zona de la clínica. |
| Horas de recordatorio | `ReminderSchedule` 18:00 / 08:00 | `ReminderTimes` desde `configuracion_clinica`; los valores por defecto son los de hoy. Se conserva el reloj inyectable (RF05), así los casos CP-RF05 siguen simulando las 18:00 y las 08:00. |
| Código de cita | Global `VD-####` | `{prefijo_cita}-####`, tomado de `clinicas.siguiente_cita` con `UPDATE … SET siguiente_cita = siguiente_cita + 1 RETURNING`, con bloqueo de fila. Villadent continúa desde su valor actual. |
| Formato de celular | `^3[0-9]{9}$` + prefijo `57` (`InternationalPhoneFormatter`) | `NormalizePhoneUseCase` recibe el `codigo_pais` de la clínica. La regla de Colombia no cambia. |
| Enlace de gestión | `app.manage-link-base` | `https://{host de la clínica}/cita/{token}`, armado con el dominio principal de la clínica. |

### 5.5 Programador de recordatorios

`ReminderScheduler` sigue siendo un único sondeo global y usa el `DataSource` de `agendapro_platform`. Para cada recordatorio vencido:
1. carga el recordatorio con su `id_clinica`;
2. fija `TenantContext` en esa clínica para la transacción de envío;
3. envía con las credenciales de esa clínica (§5.6).

Si fallan las credenciales de una clínica, solo se marcan como fallidos sus recordatorios (con la lógica de reintento que ya existe), sin bloquear a las demás. El intervalo de sondeo y el interruptor de activación no cambian.

### 5.6 WhatsApp

- **Credenciales por llamada:** se introduce un `WhatsAppCredentialsProvider` (puerto driven, con caché que se invalida al actualizar la configuración). `WhatsAppReminderSender` y el emisor de verificación obtienen token, phone-number-id, plantilla e idioma **en cada llamada**, según la clínica de `TenantContext`. Hoy reciben valores fijos de `@Value` en el constructor.
- **Plantillas:** la WABA de cada clínica debe tener aprobada la plantilla de recordatorio, y también la de autenticación si se mantiene el diseño saliente de D0. Los parámetros van en el mismo orden que hoy, y el prefijo de la URL del botón apunta al host de esa clínica.
- **Migración de credenciales:** al arrancar, `LegacyWhatsAppCredentialsMigrator` revisa si la clínica 1 tiene fila en `credenciales_whatsapp`. Si no la tiene y `app.whatsapp.*` está definido, cifra esos valores y los inserta una sola vez. Después las variables de entorno se ignoran.
- **Webhook** (necesario para el estado de entrega, y para la verificación si gana el diseño entrante de D0):
  - La firma se valida con el **app secret de la plataforma**, porque hay una sola app de Meta para todas las clínicas.
  - La clínica se resuelve con `entry[].changes[].value.metadata.phone_number_id`, buscándolo en `credenciales_whatsapp.phone_number_id`.
  - Un id desconocido se registra en el log y se responde 200 (para que Meta no reintente) sin hacer nada más.
  - El manejador local de hoy solo lee `from` y el texto, así que debe empezar a leer `metadata`.
- **Embedded Signup (fase 4):** la pantalla del administrador de plataforma abre el Embedded Signup de Meta y guarda la WABA, el phone-number-id y el token de usuario de sistema que devuelve.

### 5.7 Reportes

`templates/appointment-report.html` recibe `clinicName` y `logoUrl` como variables del modelo. `HtmlReportPdfRenderer` carga el logo desde el `logo_url` de la clínica (Cloudinary) y, si no hay, usa un logo neutro empaquetado. Las consultas de reportes quedan filtradas por `@TenantId` y por RLS.

### 5.8 Propiedades de configuración

| Se elimina o reemplaza | Por |
|---|---|
| `app.whatsapp.token`, `phone-number-id`, `template-name`, `verification-template-name`, `business-number` | `credenciales_whatsapp` (las propiedades solo se usan para la migración única) |
| `app.manage-link-base` | host de cada clínica |
| `app.cors.allowed-origin` | `app.platform.domain` + `dominios_clinica` |

Propiedades nuevas: `app.platform.domain`, `APP_CREDENTIALS_KEY`, `spring.datasource.platform.*`. Se mantienen: `app.whatsapp.app-secret`, `app.whatsapp.webhook-verify-token`, `app.whatsapp.api-url`.

---

## 6. Contrato de API y frontend

### 6.0 Contrato compartido (se acuerda primero; permite trabajar en paralelo)

**`GET /api/v1/public/clinic`**: público. Se resuelve por host o `X-Clinic-Slug`. **Nunca** incluye credenciales.

```json
{
  "slug": "villadent",
  "name": "Centro Odontológico Villadent",
  "shortName": "Villadent",
  "address": "Cra. 10 #21-14, Villa Del Rosario, Norte de Santander, Colombia",
  "phone": "+57 314 4223133",
  "whatsapp": "+57 314 4223133",
  "timeZone": "America/Bogota",
  "countryCode": "57",
  "schedule": [
    { "dayOfWeek": 1, "shifts": [ { "name": "Mañana", "start": "08:00", "end": "12:00" },
                                  { "name": "Tarde",  "start": "14:00", "end": "18:00" } ] },
    { "dayOfWeek": 6, "shifts": [] },
    { "dayOfWeek": 7, "shifts": [ { "name": "Mañana", "start": "08:00", "end": "13:00" } ] }
  ],
  "branding": { "logoUrl": "https://…", "logoDarkUrl": "https://…", "primaryColor": "#0E7490",
                "siteDescription": "…" },
  "privacyPolicy": "Markdown…"
}
```

- `dayOfWeek` va de 1 (lunes) a 7 (domingo), como `dia_semana`. El frontend lo convierte al índice de `Date#getDay()`.
- Clínica desconocida o inactiva → 404 `{"code":"clinic_not_found"}`.

**`GET|PUT /api/v1/clinic/settings`**: rol AUXILIAR. Los mismos campos que el endpoint público más `reminderTimes: {"dayBefore":"18:00","sameDay":"08:00"}`. No incluye credenciales.

**`/api/v1/platform/clinics`**: rol PLATAFORMA.
- `GET` lista las clínicas.
- `POST {slug, name, shortName, timeZone, countryCode, appointmentPrefix, firstAssistant:{name,email,password}}` → 201.
- `PATCH /{id}` acepta `{active}` o `{customDomain}`.
- `PUT /{id}/whatsapp` recibe `{phoneNumberId, businessNumber, token, reminderTemplate, verificationTemplate?, templateLanguage}` y responde **sin** devolver el token.

**Cabecera:** el frontend envía `X-Clinic-Slug` en todas las peticiones.

**Errores:** RFC 9457 `ProblemDetail` con `code` estable, como en el resto de la API.

### 6.1 Configuración de la clínica en tiempo de ejecución

- Nuevo `core/clinic/clinic-config.service.ts`:
  - Carga `GET /api/v1/public/clinic` dentro de `provideAppInitializer`.
  - Expone una señal `clinic()` con la misma forma que el `Clinic` actual más `schedule`, `branding` y `privacyPolicy`.
  - Si recibe 404, muestra la página «Clínica no encontrada».
- La constante `CLINIC` y las funciones `shiftsForDay`/`shiftsForDate` de `core/config/clinic.ts` se reemplazan por funciones que reciben el horario cargado. Hay que actualizar estos consumidores:
  - `whatsapp-bubble.ts`, `public-header.ts` (`PUBLIC_WHATSAPP_NUMBER` y `PUBLIC_WHATSAPP_URL` pasan a ser calculados)
  - `privacy-page.ts`, `booking-flow.ts`
  - `core/domain/availability.ts`, `day-agenda.ts`, `landing-page.ts`
- Un interceptor HTTP agrega `X-Clinic-Slug`, derivado de `location.hostname`, a todas las llamadas de `clinic-api.ts`.
- La disponibilidad la sigue decidiendo la API. El horario del frontend es solo para mostrar, como ya indica el comentario de `clinic.ts`.

### 6.2 Marca

- **Colores:** `primaryColor` se aplica como propiedad CSS en `:root` y los tokens del tema de Tailwind 4 la referencian. Si el color no cumple contraste WCAG AA contra blanco, se usa la paleta por defecto. Así se mantienen los casos CP-RNF de accesibilidad.
- **Logo:** `shared/ui/logo.ts` usa `branding.logoUrl` y `logoDarkUrl`, con un logo neutro empaquetado como respaldo. Los archivos `public/brand/villadent-*` pasan a la configuración de Villadent en Cloudinary, y en `public/brand/` quedan favicons neutros.
- **`index.html`:** título estático neutro «AgendaPro» y descripción neutra. Los servicios `Title` y `Meta` ponen el nombre de la clínica después de cargar. Se acepta el impacto en SEO (los rastreadores que no ejecutan JS ven el título neutro). El renderizado en servidor queda fuera del alcance.
- **Claves de almacenamiento:** `villadent-theme` → `agendapro-theme`, y `villadent-sesion` → `agendapro-session:{slug}`. Se separa la sesión por clínica para que dos pestañas en dos clínicas no mezclen sesiones. Para Villadent se leen una vez las claves antiguas y luego se borran.
- **CSP:** el script en línea de `index.html` cambia, así que hay que correr `pnpm verify:csp --update` y commitear los hashes nuevos. `img-src` debe permitir `https://res.cloudinary.com`. La CSP sigue en `vercel.json`, igual para todos los hosts.

### 6.3 Pantallas nuevas

- **Personal (AUXILIAR):** «Configuración de la clínica», en una ruta propia, con identidad, contacto, horario de atención, horas de recordatorio, marca y texto de privacidad.
- **Plataforma (PLATAFORMA):** lista de clínicas, crear clínica (slug, nombre, primer auxiliar), activar/desactivar, dominio propio, y credenciales de WhatsApp o Embedded Signup.

---

## 7. Infraestructura y despliegue

- **DNS:** comodín `*.<dominio-plataforma>` → Vercel. Hay que agregar el dominio comodín al proyecto de Vercel y un dominio propio por clínica (CNAME, luego verificación en `dominios_clinica`).
- **Proxy:** el rewrite de Vercel `/api/:path*` → backend se mantiene, y el backend recibe el `Host` original por `X-Forwarded-Host`. Se activa `server.forward-headers-strategy=framework` y se registra el proxy como confiable. **El filtro solo confía en `X-Forwarded-Host` cuando viene del proxy.**
- **Roles de base de datos:** `agendapro_app` (con RLS) y `agendapro_platform` (BYPASSRLS). Los crea un script de operaciones, no Flyway, y quedan documentados en el README del backend.
- **Meta:** una sola app de Meta (la de la plataforma), registrada como Tech Provider para Embedded Signup. Cada clínica tiene su propia WABA y su número.
- **Secretos:** `APP_CREDENTIALS_KEY` solo existe en el entorno del backend. Al rotarla se vuelven a cifrar los valores de `credenciales_whatsapp.token_cifrado`.

---

## 8. Requisitos de seguridad y privacidad

1. Ningún endpoint devuelve ni acepta datos de una clínica distinta a la resuelta. Un ID de otra clínica responde **404**, no 403, para no revelar que existe.
2. Un JWT del personal de la clínica A usado en el host de la clínica B → 403.
3. RLS está activada y forzada en todas las tablas de clínica. Una prueba de integración lo comprueba en el catálogo (`pg_class.relrowsecurity` y `relforcerowsecurity`), para que una tabla nueva no se lo salte sin que nadie lo note.
4. Las credenciales se guardan cifradas y nunca se registran en logs ni se serializan. Los `ProblemDetail` nunca las repiten.
5. Ley 1581 (Colombia): cada clínica es responsable del tratamiento y la plataforma es encargada. La política de privacidad es por clínica y los términos de la plataforma incluyen un acuerdo de transmisión de datos.
6. Los límites de verificación son por clínica **y** globales por IP.
7. Columnas de auditoría `creado_por` y `creado_en` en `clinicas` y `credenciales_whatsapp`.

---

## 9. Compatibilidad hacia atrás para Villadent

- Todas las filas existentes pasan a la clínica 1. Los códigos de cita, tokens de gestión, recordatorios y horarios actuales siguen funcionando.
- El horario, la zona horaria, las horas de recordatorio, el prefijo de cita y las plantillas de WhatsApp de la clínica 1 se cargan con los valores de hoy.
- Los enlaces de gestión que ya se enviaron (`<host antiguo>/cita/{token}`) siguen funcionando, porque el host antiguo se registra como dominio propio de la clínica 1.
- Todos los casos de prueba existentes (CP-RF01…RF10, CP-RNF…) deben pasar sin cambios contra la clínica 1. Esta es la compuerta de regresión de cada fase.

---

## 10. Impacto en el plan de pruebas (propuesta; QA es dueño del plan)

El plan no tiene ningún requisito de multi-tenencia. Se propone un requisito nuevo, **RF11 «Operación multi-clínica»**, más un RNF de aislamiento. Los casos de abajo son **propuestas con IDs provisionales**. Según el `CLAUDE.md`, el plan y la tabla de control de cambios se actualizan antes de implementar, y cada prueba lleva el ID definitivo en su nombre.

| ID provisional | Nivel | Caso | Resultado esperado |
|---|---|---|---|
| CP-RF11-01 | I | `GET /api/v1/public/clinic` público en el host `villadent.<dominio>` | 200 con el nombre, el horario y la marca de Villadent; sin credenciales en el cuerpo |
| CP-RF11-02 | I | Petición pública con un slug desconocido o inactivo | 404, `code=clinic_not_found` |
| CP-RF11-03 | I | El auxiliar de la clínica A lista citas | Solo ve las citas de la clínica A |
| CP-RF11-04 | I | El auxiliar de la clínica A pide el ID de una cita de la clínica B | 404 |
| CP-RF11-05 | I | JWT de la clínica A enviado con el slug o host de la clínica B | 403 |
| CP-RF11-06 | I | El mismo celular agenda en las clínicas A y B | Dos pacientes distintos; ambas citas se crean |
| CP-RF11-07 | I | Insertar una cita que une un paciente de la clínica A con un odontólogo de la clínica B (por repositorio, saltando el servicio) | La rechaza la llave foránea compuesta |
| CP-RF11-08 | U | `ClinicSchedule` con el sábado abierto | Se ofrecen franjas el sábado; los días cerrados se rechazan (espejo de los casos de horario actuales) |
| CP-RF11-09 | U | Recordatorios de una clínica en `America/Mexico_City` con horas 19:00/09:00 (reloj inyectable) | Se programan a esas horas locales convertidas a UTC |
| CP-RF11-10 | I | Envío de un recordatorio de la clínica B | Sale con el phone-number-id y la plantilla de la clínica B (el cliente falso de WhatsApp los registra) |
| CP-RF11-11 | I | Webhook con un `phone_number_id` desconocido | 200, no se guarda nada |
| CP-RF11-12 | I | El administrador de plataforma crea una clínica | Se crean la clínica, su configuración, su horario y su primer auxiliar, que puede iniciar sesión en el host nuevo |
| CP-RF11-13 | I | Un auxiliar llama a `/api/v1/platform/clinics` | 403 |
| CP-RF11-14 | E2E | Dos clínicas con nombres y colores distintos en dos hosts | Cada sitio muestra su propio nombre, logo y color; una cita agendada en una no aparece en la otra |
| CP-RNF-ISO-01 | I | Revisión del catálogo | Toda tabla con `id_clinica` tiene RLS activada y forzada |
| CP-RNF-ISO-02 | I | Consulta como `agendapro_app` sin `app.clinic_id` | Cero filas |

Infraestructura de pruebas:
- Un `TenantTestSupport` que crea la clínica B, su personal y sus credenciales falsas de WhatsApp.
- Testcontainers debe crear el rol `agendapro_app` y conectar el `DataSource` de la aplicación con él. Si no, RLS no se ejercita, porque el dueño de la tabla se salta la RLS no forzada.
- E2E: `e2e/run.sh` sirve dos hosts (`villadent.localhost` y `demo.localhost`), y `DemoDataSeeder` crea una segunda clínica en el perfil `demo`.
- El criterio de salida de cobertura (≥ 70 % de ramas en reglas de disponibilidad y recordatorios) aplica a `ClinicSchedule` y `ReminderTimes`.

---

## 11. Plan de entrega (cada fase = PRs a `main`, todas las suites en verde)

| Fase | Contenido | Termina cuando |
|---|---|---|
| 0 | D0 decidida; casos del §10 y fila de control de cambios agregados; divergencia de la rama local resuelta; contrato §6.0 acordado | Plan actualizado y decisión registrada |
| 1 | Módulo `clinics`, `V10`, `GET /clinic` público; `ClinicConfigService` en el frontend reemplaza `CLINIC` (solo Villadent) | Villadent sin cambios; CP-RF11-01, 02 y 08 en verde |
| 2 | `V11` con columnas de clínica y llaves compuestas, `@TenantId`, `TenantContext`, `CurrentUser`, `clinicId` en el JWT, login por clínica | CP-RF11-03…07 y 13 en verde; todos los casos existentes en verde |
| 3 | `V12` con RLS y roles de base de datos; zona horaria, horas de recordatorio, código de cita y país del celular por clínica | CP-RNF-ISO-01/02 y CP-RF11-09 en verde |
| 4 | Credenciales de WhatsApp por clínica, enrutamiento del webhook, marca en reportes, Embedded Signup | CP-RF11-10 y 11 en verde |
| 5 | Pantallas del administrador de plataforma y de configuración de la clínica, dominios comodín y propios, marca neutra, actualización de la CSP | CP-RF11-12 y 14 en verde; `pnpm verify:csp` en verde |

Las fases 1 a 3 son el núcleo mínimo multi-clínica; las fases 4 y 5 lo vuelven operable como producto. Cada fase cierra con su fila de control de cambios (una por hito terminado, según el `CLAUDE.md`). El reparto por desarrollador está en los dos archivos de tareas.

---

## 12. Decisiones abiertas

| ID | Decisión | Recomendación |
|---|---|---|
| D0 | Diseño de verificación: plantilla saliente de main o webhook entrante de la rama local | Decidir antes de la fase 1; el que gane entra como migración nueva |
| D1 | Dominio de la plataforma y nombre del producto | Neutro, por ejemplo «AgendaPro» |
| D2 | ¿Un odontólogo o auxiliar puede trabajar en más de una clínica? | No por ahora (AD4); se revisa con una tabla de membresías |
| D3 | Embedded Signup ahora o credenciales ingresadas a mano | Primero a mano; Embedded Signup en la fase 4 |
| D4 | Países distintos de Colombia | Mantener la regla de Colombia; parametrizar solo cuando llegue una clínica de otro país |
| D5 | Momento frente al calendario del curso | Tratarlo como hoja de ruta hasta cerrar las entregas actuales |

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| Un filtro olvidado filtra datos entre clínicas | Dos capas (`@TenantId` + RLS forzada), prueba de catálogo, casos de integración entre clínicas |
| Falsificar `X-Forwarded-Host` para seleccionar otra clínica | Solo se confía en él si viene del proxy; el tráfico del personal queda atado al claim del JWT |
| RLS no se ejercita en las pruebas porque se conecta el dueño | El `DataSource` de la aplicación usa `agendapro_app` también en Testcontainers |
| La aprobación de plantillas de Meta por clínica retrasa el alta | La clínica queda inactiva para recordatorios hasta que se aprueben; el agendamiento funciona igual |
| Migración grande sobre `citas` | El volumen de datos hoy es pequeño; V11 corre en una sola transacción en una ventana de mantenimiento |
| Rama local de verificación divergente | Resolver D0 primero; nunca editar V9 |
| Dos desarrolladores tocando el mismo archivo | Dueños de archivo definidos en los archivos de tareas; solo A crea migraciones; el contrato §6.0 se acuerda antes |
