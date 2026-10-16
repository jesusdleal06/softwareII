# Villadent AgendaPro - Frontend

Aplicación web en **Angular** para el agendamiento de citas del Centro Odontológico Villadent.

> **Fase actual:** prototipo funcional. Los datos son simulados en memoria (`src/app/core/data/mock-data.ts`) y no hay backend todavía. Al recargar la página se pierden las citas creadas; solo la sesión del personal se conserva por pestaña (`sessionStorage`).

**Stack:** Angular 22.2 (componentes standalone, signals) · Tailwind CSS v4 · `@lucide/angular` · Vitest 5 + jsdom

---

## Requisitos

- Node.js 26 (versión usada en el desarrollo: v26.11.1)
- pnpm 11 (declarado en `packageManager`: `pnpm@11.28.5`)

## Comandos

Ejecutar desde `Desarrollo/frontend/`:

| Comando            | Descripción                                                 |
| ------------------ | ----------------------------------------------------------- |
| `pnpm install`     | Instala las dependencias                                    |
| `pnpm start`       | Servidor de desarrollo en `http://localhost:4200/`          |
| `pnpm run build`   | Compilación de producción en `dist/villadent-frontend/`     |
| `pnpm run test:ci` | Ejecuta todas las pruebas unitarias una sola vez (sin watch) |

---

## Datos de demostración

**Usuarios del personal** (ingreso en `/ingreso`):

| Correo               | Contraseña      | Nombre                | Rol                     |
| -------------------- | --------------- | --------------------- | ----------------------- |
| `ana@villadent.co`   | `villadent2024` | Ana María Rueda       | Auxiliar administrativa |
| `laura@villadent.co` | `villadent2024` | Dra. Laura Villamizar | Odontóloga              |

**Cita de ejemplo:** `/cita/VD-1049` (constante `DEMO_CODE`), la página a la que llega el paciente desde el recordatorio de WhatsApp.

**Teléfono del paciente:** celular colombiano de 10 dígitos que empieza por `3` (por ejemplo `3001234567`). El paciente debe escribir nombre y apellido.

Las citas de ejemplo se generan relativas a la semana actual (a partir del lunes), por lo que siempre hay datos visibles en la agenda.

---

## Rutas

| Ruta               | Pantalla                                   | Acceso                                  |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| `/`                | Inicio                                     | Público                                 |
| `/agendar`         | Agendamiento en 3 pasos                    | Público                                 |
| `/cita/:codigo`    | Consultar, confirmar, reprogramar o cancelar una cita | Público                      |
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
│   ├── data/       # Datos simulados (mock) y estilos por estado de cita
│   ├── domain/     # Reglas de negocio como funciones puras (disponibilidad, teléfono, recordatorios, reportes)
│   ├── services/   # AppStore (estado con signals) y tokens inyectables (CLOCK, SESSION_STORAGE)
│   └── guards/     # Guards de autenticación y rol
├── shared/
│   ├── ui/         # Componentes de presentación reutilizables (botones, badges, stepper, modal, campos)
│   ├── booking/    # Selector de horario y formulario del paciente (usados por paciente y personal)
│   └── browser/    # Utilidades del navegador (media queries)
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

---

## Siguiente paso

Reemplazar el `AppStore` simulado por llamadas HTTP (`HttpClient`) a la API **Spring Boot** (`Desarrollo/backend`). Las reglas de negocio definitivas (disponibilidad, una cita activa por teléfono, concurrencia) vivirán en el backend; el frontend solo las presentará.
