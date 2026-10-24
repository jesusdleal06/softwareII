# Villadent AgendaPro - Frontend

Aplicación web en **Angular** para el agendamiento de citas del Centro Odontológico Villadent.

> **Fase actual:** conectado a la API Spring Boot de `Desarrollo/backend`. Todos los datos (odontólogos, procedimientos, disponibilidad, citas y reportes) vienen del backend, que también aplica las reglas de negocio. La sesión del personal se conserva por pestaña (`sessionStorage`).

**Stack:** Angular 22.2 (componentes standalone, signals) · Tailwind CSS v4 · `@lucide/angular` · Vitest 5 + jsdom

**Tema:** la interfaz es clara por omisión y el encabezado tiene un conmutador claro/oscuro. La preferencia se guarda en `localStorage` y se aplica antes del primer pintado, para que no haya destello de tema incorrecto.

---

## Requisitos

- **Node.js 26** y **pnpm 11** (`packageManager`: `pnpm@11.28.5`), o
- **Docker** con Docker Compose: la imagen ya incluye Node 26 y pnpm 11.28.5, así que no hay que instalarlos en el equipo.

## Cómo iniciar el entorno de desarrollo

**Primero el backend.** El frontend no trae datos propios: necesita la API en el puerto 8080. Desde `Desarrollo/backend/`, con el perfil de demostración para tener odontólogos, procedimientos y usuarios de prueba:

```bash
docker compose up -d postgres
SPRING_PROFILES_ACTIVE=demo ./gradlew bootRun
```

Los detalles (base de datos, variables y la primera cuenta de la auxiliar) están en `Desarrollo/backend/README.md`.

Luego el frontend. Todos los comandos siguientes se ejecutan desde `Desarrollo/frontend/`. En los dos modos, el servidor de desarrollo reenvía las llamadas a `/api` hacia el backend (`proxy.conf.mjs`): en local apunta a `http://localhost:8080`, y en Docker a `http://host.docker.internal:8080`, porque dentro del contenedor `localhost` es el propio contenedor. Otro destino se indica con la variable `API_TARGET`.

### Opción A — Docker (recomendada: no exige Node ni pnpm en el equipo)

| Comando                                         | Descripción                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| `docker compose up -d`                          | Construye la imagen y arranca el servidor de desarrollo |
| `docker compose exec frontend pnpm run test:ci` | Ejecuta las pruebas unitarias dentro del contenedor     |
| `docker compose logs -f frontend`               | Sigue los registros del servidor                        |
| `docker compose down`                           | Detiene el contenedor                                   |

La aplicación queda en `http://localhost:4200/`. El código se monta como volumen, así que los cambios en `src/` se reflejan con recarga automática sin reconstruir la imagen.

- El contenedor instala sus propias dependencias con pnpm en un volumen anónimo que oculta el `node_modules` del equipo: una instalación local previa no interfiere.
- El contenedor corre como usuario `node` (uid 1000), no como root, para que los archivos que `ng` escribe sobre el código montado sigan siendo editables en el equipo. Si el uid del equipo no es 1000, ajustar `user: "<uid>:<gid>"` en `docker-compose.yml`.
- `node_modules` y `.angular` son volúmenes anónimos. Si vienen de una construcción anterior a la corrección de permisos, o se cambió el uid, hay que recrearlos una vez con `docker compose up -d --renew-anon-volumes`.

### Opción B — Local con Node y pnpm

```bash
pnpm install
pnpm start
```

| Comando            | Descripción                                                 |
| ------------------ | ----------------------------------------------------------- |
| `pnpm install`     | Instala las dependencias                                    |
| `pnpm start`       | Servidor de desarrollo en `http://localhost:4200/`          |
| `pnpm run build`   | Compilación de producción en `dist/villadent-frontend/`     |
| `pnpm run test:ci` | Ejecuta todas las pruebas unitarias una sola vez (sin watch) |

---

## Datos de demostración

Los carga el backend con el perfil `demo` (ver `Desarrollo/backend/README.md`), con los mismos odontólogos, procedimientos y horarios del prototipo. Sin ese perfil, la aplicación arranca vacía.

**Usuarios del personal** (ingreso en `/ingreso`; solo existen con el perfil `demo`):

| Correo               | Contraseña      | Nombre                | Rol                     |
| -------------------- | --------------- | --------------------- | ----------------------- |
| `ana@villadent.co`   | `villadent2024` | Ana María Rueda       | Auxiliar administrativa |
| `laura@villadent.co` | `villadent2024` | Dra. Laura Villamizar | Odontóloga              |

**Página de la cita:** el paciente llega a `/cita/<enlace>` desde el recordatorio de WhatsApp. El enlace es un código personal e imposible de adivinar; el backend guarda solo su hash, así que no hay un enlace de ejemplo. Sin credenciales de WhatsApp Business configuradas, el recordatorio no se envía (queda registrado el error y se reintenta).

**Teléfono del paciente:** celular colombiano de 10 dígitos que empieza por `3` (por ejemplo `3001234567`). El paciente debe escribir nombre y apellido.

El perfil `demo` no crea citas: se agendan desde `/agendar` o como cita manual en el panel.

---

## Rutas

| Ruta               | Pantalla                                   | Acceso                                  |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| `/`                | Inicio                                     | Público                                 |
| `/agendar`         | Agendamiento en 3 pasos                    | Público                                 |
| `/cita/:enlace`    | Consultar, confirmar, reprogramar o cancelar una cita con el enlace personal | Público   |
| `/ingreso`         | Ingreso del personal                       | Público                                 |
| `/acceso-denegado` | Acceso denegado                            | Público                                 |
| `/panel`           | Redirige a la pantalla inicial del rol     | Personal autenticado                    |
| `/panel/agenda`    | Agenda diaria de todos los odontólogos     | Auxiliar administrativa                 |
| `/panel/mi-agenda` | Agenda propia                              | Odontóloga                              |
| `/panel/reportes`  | Reportes de citas                          | Auxiliar administrativa                 |

- Sin sesión, cualquier ruta de `/panel` redirige a `/ingreso`.
- Con un rol no permitido, redirige a `/acceso-denegado?ruta=<ruta>`.
- Los guards están en `src/app/core/guards/staff-access.ts`; los roles por pantalla, en `src/app/features/staff/staff-sections.ts`.

---

## Estructura

```
src/app/
├── core/
│   ├── models/     # Tipos del dominio (cita, odontólogo, procedimiento, usuario, clínica)
│   ├── api/        # Cliente HTTP de la API (ClinicApi), tipos de la respuesta y adaptadores al modelo
│   ├── config/     # Datos fijos de la clínica (nombre, dirección, horario)
│   ├── data/       # Estilos por estado de cita
│   ├── domain/     # Reglas de negocio como funciones puras (disponibilidad, teléfono, recordatorios, reportes)
│   ├── services/   # AppStore (sesión, catálogos y agenda con signals; llama a la API) y tokens inyectables (CLOCK, SESSION_STORAGE)
│   └── guards/     # Guards de autenticación y rol
├── shared/
│   ├── ui/         # Componentes de presentación reutilizables (botones, badges, stepper, modal, campos)
│   ├── booking/    # Selector de horario y formulario del paciente (usados por paciente y personal)
│   └── browser/    # Utilidades del navegador (media queries y preferencia de tema)
└── features/
    ├── public/     # Inicio, agendamiento y página de la cita
    └── staff/      # Ingreso, panel del personal, agenda, mi agenda y reportes
```

**Convención contenedor / presentación:** las páginas (`pages/`) inyectan servicios y manejan el estado; los componentes de presentación solo reciben datos con `input()` y emiten eventos con `output()`.

---

## Pruebas

- Cada archivo de prueba (`*.spec.ts`) está junto al código que prueba.
- Las reglas de `core/domain` se prueban como funciones puras; los componentes, con `TestBed` sobre jsdom.
- La fecha actual se inyecta con el token `CLOCK` (`core/services/tokens.ts`), que las pruebas reemplazan por una fecha fija para obtener resultados deterministas.
- Ninguna prueba llama a la red. Los componentes usan `createFakeStore()` (`shared/testing/fake-store.ts`), un doble de `AppStore` con el mismo catálogo del perfil `demo`. Las pruebas de integración que usan el `AppStore` real reemplazan la red con `provideHttpClientTesting()`, y `ClinicApi` se prueba así mismo (`core/api/clinic-api.spec.ts`): URL, método y que el token del personal vaya solo a las rutas del personal.
- **Si una prueba no refleja un cambio reciente**, borrar la caché de módulos de Vitest y volver a ejecutar: `rm -rf node_modules/.vitest-cache`. Esa caché puede quedarse con una versión vieja de un archivo importado cuando el archivo de prueba no cambió.

---

## Siguiente paso

Pruebas de extremo a extremo con Playwright (casos E2E del plan de pruebas) sobre el frontend y el backend reales.
