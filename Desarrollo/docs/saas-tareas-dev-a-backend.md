# Tareas — Desarrollador A: núcleo de backend (datos, aislamiento, seguridad, dominio)

Especificación: [`saas-multi-tenant-spec.md`](saas-multi-tenant-spec.md). Lee la especificación completa antes de empezar; cada tarea cita sus secciones (§).
Contraparte: [`saas-tareas-dev-b-frontend-integraciones.md`](saas-tareas-dev-b-frontend-integraciones.md).

## Reglas de trabajo entre los dos

- **Eres dueño de todas las migraciones Flyway.** B nunca crea una. Si B necesita una columna, te la pide y tú la agregas. Esto evita la colisión de versiones `V10` que ya ocurrió con `V5`.
- **Archivos tuyos:**
  - `db/migration/**`
  - `modules/clinics/**`
  - `shared/tenancy/**` y `shared/security/**`
  - `modules/users/**`
  - las entidades JPA y los adaptadores de persistencia de todos los módulos
  - `modules/dentists/domain/**`, `modules/reminders/domain/**` y `ReminderScheduler`
  - `modules/appointments/**` (código de cita)
  - `modules/patients/**` (celular)
- **Archivos de B, que tú no tocas:**
  - todo `Desarrollo/frontend/**` y `Desarrollo/e2e/**`
  - `modules/reminders/infrastructure/whatsapp/**` y `modules/verification/infrastructure/whatsapp/**`
  - el webhook de WhatsApp, `modules/reports/**` (plantilla y renderer) y `vercel.json`
- **Contrato primero:** el §6.0 se acuerda entre los dos antes de A1 y no cambia sin avisar al otro.
- **Ramas:** cada tarea sale en su propia rama `feat/saas-<tarea>` desde `origin/main` actualizado, con un PR a `main` y todas las suites en verde (`./gradlew check`). Antes de cada migración, toma la versión libre en `origin/main`.
- **TDD:** escribe la prueba con el ID del caso en `@DisplayName` antes del código (RED → GREEN). Los IDs del §10 son provisionales hasta que QA los agregue al plan.

## Tarea 0 (conjunta, bloqueante)

- [ ] Decidir D0 (diseño de verificación) y resolver la rama local `feat/whatsapp-phone-verification` sin editar V9.
- [ ] Acordar el contrato §6.0 con B.
- [ ] QA agrega RF11 y los casos del §10 al plan, y se registra la fila de control de cambios.

## Tareas

| ID | Tarea | § | Casos | Depende de | Habilita a B |
|---|---|---|---|---|---|
| A1 | `V10__clinics.sql`: `clinicas`, `dominios_clinica`, `horarios_clinica`, `configuracion_clinica`, `credenciales_whatsapp`; carga de Villadent como clínica 1 con los valores actuales (horario, prefijo, `siguiente_cita`, logo) | 4.1 | — | T0 | B4, B5 |
| A2 | Módulo `clinics`: dominio (`Clinic`, `ClinicSlug`, `ClinicSchedule`, `ClinicBranding`, `ReminderTimes`, `WhatsAppCredentials`), puertos, `ClinicConfig`, persistencia, `CredentialCipher` (AES-GCM con `APP_CREDENTIALS_KEY`) | 5.1, AD6 | CP-RF11-08 | A1 | — |
| A3 | Endpoint público `GET /api/v1/public/clinic`, resuelto por `X-Clinic-Slug` o host; 404 `clinic_not_found`. **Fin de la fase 1 del backend** | 5.1, 6.0 | CP-RF11-01, 02 | A2 | B1 (deja de usar el mock) |
| A4 | Reemplazar `ClinicHours` por `ClinicSchedule` en `Schedule.validate`; dejar de usar la semántica de V7 | 5.4 | regresión de los casos de horario actuales | A2 | — |
| A5 | `V11__tenant_columns.sql`: `id_clinica` en las 11 tablas, relleno con 1, unicidades e índices nuevos, llaves foráneas compuestas, rol `PLATAFORMA` | 4.2 | CP-RF11-06, 07 | A1 | — |
| A6 | `shared/tenancy`: `TenantContext`, `TenantResolutionFilter`, `CurrentTenantIdentifierResolver`, `@TenantId` en todas las entidades, `set_config('app.clinic_id')` por transacción | 5.2 | CP-RF11-03, 04 | A5 | B6 |
| A7 | Seguridad: claim `clinicId` y emisor `agendapro` en el JWT, `CurrentUser` en los 4 controladores, login por `(clínica, correo)`, `/api/v1/platform/**` → PLATAFORMA, CORS por patrones y dominios, administrador inicial de plataforma. **Fin de la fase 2** | 5.3 | CP-RF11-05, 13; regresión de los casos 401/403 | A6 | B2, B7 |
| A8 | `V12__row_level_security.sql` + script de roles `agendapro_app` / `agendapro_platform` + segundo `DataSource` de plataforma; Testcontainers conecta como `agendapro_app` | 4.3, 7 | CP-RNF-ISO-01, 02 | A6 | — |
| A9 | Reglas por clínica: zona horaria (`Clock` en UTC + zona de la clínica en los mappers de recordatorios), `ReminderTimes`, código de cita `{prefijo}-####` con bloqueo de fila, `NormalizePhoneUseCase` con `codigo_pais`, enlace de gestión con el host de la clínica. **Fin de la fase 3** | 5.4 | CP-RF11-09; regresión de CP-RF05 | A6 | B6 |
| A10 | `ReminderScheduler` global con el `DataSource` de plataforma; fija `TenantContext` por recordatorio; aísla los fallos por clínica | 5.5 | parte de CP-RF11-10 (junto con B6) | A8, A9 | B6 |
| A11 | Puerto `WhatsAppCredentialsProvider` + caso de uso `GetClinicWhatsAppCredentialsUseCase` + `LegacyWhatsAppCredentialsMigrator` (`app.whatsapp.*` → fila de la clínica 1) | 5.6 | — | A2 | B6, B8 |
| A12 | API de plataforma y de configuración: `GET|PUT /api/v1/clinic/settings`, `/api/v1/platform/clinics` (crear con su primer auxiliar, activar/desactivar, dominio propio, `PUT /{id}/whatsapp` sin devolver el token) | 6.0, 6.3 | CP-RF11-12 | A7, A11 | B10, B11 |
| A13 | Semilla `demo`: segunda clínica `demo` en `DemoDataSeeder`, con personal y credenciales falsas; `TenantTestSupport` para las pruebas | 10 | — | A7 | B12 |
| A14 | Migración de limpieza: quitar la semántica de horario de clínica de `horarios_odontologo` y eliminar `citas_codigo_seq` | 4.4 | regresión completa | A4, A9 en producción | — |
| A15 | Documentar en el README del backend los roles de base de datos, `APP_CREDENTIALS_KEY`, `app.platform.domain` y `spring.datasource.platform.*`; quitar las propiedades reemplazadas (§5.8) | 5.8, 7 | — | A8, A11 | — |

## Orden sugerido

A1 → A2 → A3 (B ya puede integrar) → A4 → A5 → A6 → A7 → A11 → A8 → A9 → A10 → A12 → A13 → A15 → A14.

## Puntos de sincronización con B

1. **Al terminar A3:** B conecta `ClinicConfigService` al endpoint real.
2. **Al terminar A7:** B adapta el login y las claves de sesión por clínica; el JWT ya trae `clinicId`.
3. **Al terminar A11:** B cambia los emisores de WhatsApp para que lean las credenciales por llamada.
4. **Al terminar A12 y A13:** B construye las pantallas nuevas y la prueba E2E de dos clínicas.
