# Tareas — Desarrollador B: frontend, integraciones (WhatsApp, reportes), infraestructura y E2E

Especificación: [`saas-multi-tenant-spec.md`](saas-multi-tenant-spec.md). Lee la especificación completa antes de empezar; cada tarea cita sus secciones (§).
Contraparte: [`saas-tareas-dev-a-backend.md`](saas-tareas-dev-a-backend.md).

## Reglas de trabajo entre los dos

- **No creas migraciones Flyway.** Si necesitas una columna, pídesela a A.
- **Archivos tuyos:**
  - todo `Desarrollo/frontend/**`, `Desarrollo/e2e/**` y `vercel.json`
  - `modules/reminders/infrastructure/whatsapp/**` y `modules/verification/infrastructure/whatsapp/**`
  - el controlador del webhook de WhatsApp
  - `modules/reports/**` (plantilla `appointment-report.html` y `HtmlReportPdfRenderer`)
- **Archivos de A, que tú no tocas:**
  - migraciones, `modules/clinics/**`, `shared/tenancy/**`, `shared/security/**`
  - entidades y adaptadores de persistencia
  - dominio de horarios y recordatorios, y `ReminderScheduler`
- **Contrato primero:** el §6.0 se acuerda con A antes de B1. Mientras A3 no esté en `main`, trabaja contra un mock con exactamente esa forma.
- **Ramas:** cada tarea sale en su propia rama `feat/saas-<tarea>` desde `origin/main` actualizado, con un PR a `main`. Las suites deben estar en verde: `pnpm test --watch=false && pnpm build && pnpm verify:csp`; `./gradlew check` si tocaste el backend; `Desarrollo/e2e/run.sh` para los casos E2E.
- **TDD:** escribe la prueba con el ID del caso en el nombre antes del código (`it('CP-RF11-14: …')`, `@DisplayName("CP-RF11-10: …")`). Los IDs del §10 son provisionales hasta que QA los agregue al plan.

## Tarea 0 (conjunta, bloqueante)

- [ ] Decidir D0 (diseño de verificación) y resolver la rama local `feat/whatsapp-phone-verification` sin editar V9.
- [ ] Acordar el contrato §6.0 con A.
- [ ] QA agrega RF11 y los casos del §10 al plan, y se registra la fila de control de cambios.

## Tareas

| ID | Tarea | § | Casos | Depende de | Habilita a A |
|---|---|---|---|---|---|
| B1 | `core/clinic/clinic-config.service.ts` con `provideAppInitializer`, señal `clinic()`, página «Clínica no encontrada» si recibe 404, e interceptor `X-Clinic-Slug` desde `location.hostname`. Primero contra un mock del §6.0; después contra A3 | 6.0, 6.1 | pruebas unitarias del servicio y del interceptor | T0 | — |
| B2 | Reemplazar `CLINIC` y `shiftsForDay`/`shiftsForDate` de `core/config/clinic.ts` en `whatsapp-bubble.ts`, `public-header.ts` (`PUBLIC_WHATSAPP_*` calculados), `privacy-page.ts`, `booking-flow.ts`, `core/domain/availability.ts`, `day-agenda.ts` y `landing-page.ts`. Las specs existentes deben seguir en verde con los datos de Villadent. **Fin de la fase 1 del frontend** | 6.1 | regresión de las specs actuales | B1 | — |
| B3 | Claves de almacenamiento: `agendapro-theme` y `agendapro-session:{slug}`, con lectura única de las claves antiguas `villadent-*`; actualizar el script en línea de `index.html` y regenerar los hashes con `pnpm verify:csp --update` | 6.2 | specs de `theme` y `app-store` | B1 | — |
| B4 | Marca: color primario como variable CSS conectada a los tokens de Tailwind 4, con respaldo si falla el contraste AA; `logo.ts` con `logoUrl`/`logoDarkUrl` y respaldo neutro; título y meta neutros en `index.html` y servicios `Title`/`Meta`; `img-src` con Cloudinary en la CSP | 6.2 | regresión de los casos de accesibilidad CP-RNF | B1, A1 | — |
| B5 | Reportes: `appointment-report.html` y `HtmlReportPdfRenderer` reciben `clinicName` y `logoUrl`, con logo neutro de respaldo | 5.7 | pruebas del renderer | A1, A2 | — |
| B6 | Emisores de WhatsApp (`WhatsAppReminderSender` y el de verificación según D0) leen las credenciales **por llamada** desde `WhatsAppCredentialsProvider`; plantilla e idioma por clínica | 5.6 | CP-RF11-10 (junto con A10) | A11 | — |
| B7 | Login y sesión por clínica en el frontend: el login va al host de la clínica y la sesión se guarda bajo `agendapro-session:{slug}`; si se recibe un 403 por clínica distinta, se cierra la sesión | 5.3, 6.2 | spec de `app-store` | A7, B3 | — |
| B8 | Webhook: firma con el app secret de la plataforma, resolución de la clínica por `metadata.phone_number_id` y 200 sin efecto si el id es desconocido | 5.6 | CP-RF11-11 | A11 | — |
| B9 | Infraestructura: dominio comodín y dominios propios en Vercel; `X-Forwarded-Host` confiable solo desde el proxy (`server.forward-headers-strategy=framework`, coordinado con A en la configuración); documentar la configuración DNS | 7 | — | A7 | — |
| B10 | Pantalla «Configuración de la clínica» (AUXILIAR) contra `GET|PUT /api/v1/clinic/settings` | 6.3 | specs de componente | A12 | — |
| B11 | Pantallas de plataforma (PLATAFORMA): lista, alta con su primer auxiliar, activar/desactivar, dominio propio y credenciales de WhatsApp (el token nunca se muestra después de guardarlo) | 6.3 | specs de componente | A12 | — |
| B12 | E2E: `e2e/run.sh` con dos hosts (`villadent.localhost` y `demo.localhost`) y el caso de dos clínicas con nombre, logo y color propios y citas aisladas | 10 | CP-RF11-14 | A13, B2, B4 | — |
| B13 | Embedded Signup de Meta en la pantalla de plataforma (opcional, fase 4, según D3) | 5.6 | — | B11 | — |

## Orden sugerido

B1 (con mock) → B2 → B3 → B4 → (cuando A termine A3) conectar B1 al endpoint real → B5 → B7 → B6 → B8 → B9 → B10 → B11 → B12 → B13.

## Puntos de sincronización con A

1. **Al terminar A3:** quitar el mock de B1.
2. **Al terminar A7:** B7 (login y sesión por clínica).
3. **Al terminar A11:** B6 y B8 (WhatsApp por clínica).
4. **Al terminar A12 y A13:** B10, B11 y B12.
