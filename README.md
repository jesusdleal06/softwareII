# Sistema Web de Agendamiento y Recordatorio de Citas - Centro Odontológico Villadent

> **Nombre del Producto:** **Villadent AgendaPro**

Sistema web para la digitalización del agendamiento, gestión de agendas por profesional y recordatorios automáticos vía WhatsApp para el Centro Odontológico Villadent. Proyecto académico de Ingeniería de Software II - Universidad de Pamplona.

---

## Integrantes y Roles

| Nombre                              | Código     | Rol en el Proyecto                                                                                               |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Rangel Martínez Yenderson Josué** | 1127045112 | **Frontend & Backend Developer** - Arquitectura, API Spring Boot, modelo de datos y lógica de agenda             |
| **Becerra Bonilla Diego Andrés**    | 1127046551 | **Líder Técnico & UI/UX** - Interfaz Next.js, experiencia de paciente (3 pasos) y prototipos RAD                 |
| **Leal Espinel Jesús David**        | 1094047490 | **DevOps, QA & Gestión de Configuración** - Despliegue (Vercel/Render/Neon), pruebas funcionales y documentación |

**Docente:** Fanny Casadiego Chiquillo  
**Programa:** Ingeniería de Sistemas - Facultad de Ingenierías y Arquitectura  
**Sede:** Villa del Rosario - 2026

---

## Producto Final del Proyecto

**Villadent AgendaPro** - Plataforma web cliente-servidor que permite:

- Consulta de disponibilidad en tiempo real por odontólogo y fecha (bloqueo por duración 30/45/60/90 min)
- Agendamiento autónomo por el paciente (máx. 1 cita activa por teléfono) y agendamiento asistido por auxiliar
- Gestión de agendas independientes por profesional sin cruces de horario
- Recordatorios automáticos por WhatsApp (mañana: día anterior 18:00 / tarde: mismo día 08:00) con confirmación/cancelación en 1 clic
- Autenticación por roles (paciente, auxiliar, odontólogo) y reportes administrativos (diarios/mensuales)

Metodología: **Desarrollo Rápido de Aplicaciones (RAD)** con prototipos iterativos validados con el personal de Villadent.

**Stack (RNF05):** `Next.js` (Vercel) + `Spring Boot` (Render) + `PostgreSQL` (Neon)

---

## Cliente(s)

- **Cliente Principal:** Centro Odontológico Villadent (Villa del Rosario) - Auxiliar administrativa y dirección médica. Usuario final que opera la agenda y recibe el beneficio directo de reducción de ausentismo y control centralizado.
- **Usuarios Finales / Beneficiarios:** Pacientes del centro (agendamiento autónomo y recordatorios) y odontólogos especialistas (gestión de su agenda independiente).
- **Cliente Académico:** Universidad de Pamplona - Programa Ingeniería de Sistemas (Ingeniería de Software II) - Entidad evaluadora del proyecto.

---

## Estructura del Repositorio

```
proyecto/
├── Desarrollo/
│   ├── backend/      # API Spring Boot
│   ├── frontend/     # App Next.js
│   └── scripts/      # Automatización y utilidades
├── Actividades/      # Entregas por actividad del curso
├── Documentacion/    # Requisitos, arquitectura y manuales
└── README.md
```

## Flujo de Trabajo (Git)

- `main` - Rama estable y entregable (protegida)
- `develop` - Rama de integración
- `feature/<nombre>` - Desarrollo de cada historia/RF, nace de `develop` y vuelve vía Pull Request

> Ver `App/`, `Actividades/` y `Documentacion/` para detalles específicos de cada módulo.
