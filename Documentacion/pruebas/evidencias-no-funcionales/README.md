# Evidencias de pruebas no funcionales

**Fecha:** 26 de noviembre de 2026 (America/Bogota). **Entorno:** equipo de
desarrollo, stack Docker aislado `villadent-perf` (frontend 4292, API 8092,
PostgreSQL 5447). Backend en modo de desarrollo (`bootRun`, perfiles
`demo,e2e`), frontend de desarrollo y PostgreSQL 17 en memoria. Solo se usaron
datos ficticios. Las cifras no representan un despliegue ni un SLA.

## Rendimiento — S1

Comandos ejecutados desde la raíz del repositorio, con el stack ya iniciado.

| Caso | Comando | Resultado observado | Veredicto |
| --- | --- | --- | --- |
| CP-RNF04-02 | `Desarrollo/perf/run.sh steady` | 20 usuarios, 10 min; p95 **19,94 ms**, 0 solicitudes fallidas de 11.922 (incluidas dos de preparación); 5.960 reservas nuevas. | **PASS** |
| CP-RNF04-03 | `Desarrollo/perf/run.sh ramp` | 20→200 usuarios en 5 min; p95 máximo por ventana de 10 s **87,01 ms**, sin cruce de 2 s ni errores. Al minuto de terminar la carga: **4,15 ms** (HTTP 200); 16.450 respuestas 201, 16.450 citas persistidas y 0 turnos duplicados. | **Sin degradación hasta 200 usuarios: el límite está por encima del rango del caso** (ver la rampa exploratoria) |
| CP-RNF04-04 | `Desarrollo/perf/run.sh burst` | 1→45 usuarios en 10 s; p95 de la ráfaga **7,63 ms**, 0 fallos en 135 solicitudes medidas, 45 confirmaciones. La preparación no se incluye en el percentil. | **PASS** |
| CP-RNF04-05 | `Desarrollo/perf/run.sh volume` | 4.000 citas ficticias en 2025, hasta 15 por fecha poblada. Agenda: HTTP 200, 15 registros, **76,59 ms**; informe anual: HTTP 200, 4.000 registros, **65,02 ms**. | **PASS** |
| CP-RNF04-06 | `SOAK_DURATION=3m Desarrollo/perf/run.sh soak` | 5 usuarios, 3 min; p95 del intervalo parcial **25,45 ms**, 0 fallos en 452 solicitudes (incluidas dos de preparación). Memoria: 1.016, 1.017, 1.018 y 1.018 MiB. | **PASS de humo; prueba de 2 h pendiente** |

Datos: [carga estable](rnf04-02-steady.json),
[rampa](rnf04-03-ramp.json), [integridad](rnf04-03-ramp-integrity.txt),
[ráfaga](rnf04-04-reminder-burst.json), [volumen](rnf04-05-volume.txt),
[prueba de humo](rnf04-06-soak.json) y [memoria](rnf04-06-soak-memory.csv).
Tres minutos no permiten comparar dos intervalos de 10 minutos ni evaluar
crecimiento sostenido de memoria.

### Rampa exploratoria (complemento de CP-RNF04-03)

Como la rampa del plan no cruzó los 2 s, se repitió la misma carga (consulta de
disponibilidad y agendamiento, ventanas de 10 s) subiendo de 20 a **1.000
usuarios en 10 minutos**: `Desarrollo/perf/rnf04-03-ramp-explore.js`, ejecutado
con `grafana/k6` contra el mismo stack aislado.

- p95 por ventana de 10 s entre **6 y 16 ms** durante toda la rampa (la primera
  ventana, de calentamiento, 109 ms); ninguna ventana cruzó los 2 s.
- **305.325 solicitudes, 0 fallidas**; 152.655 citas creadas (201) y la misma
  cantidad persistida en PostgreSQL, con **0 turnos duplicados**.
- Un minuto después de la carga, la disponibilidad respondió en **6,23 ms**.

Conclusión: en este ambiente el límite está por encima de 1.000 usuarios
simultáneos. Más allá de esa carga, el generador de k6 comparte la máquina con el
sistema y deja de medir al sistema de forma confiable; el límite real debe
medirse en el ambiente de pruebas desplegado. Datos:
[rampa exploratoria](rnf04-03-ramp-explore.json).

La rampa y la ráfaga se repitieron con una base limpia tras corregir un
solapamiento de fechas que había generado 45 conflictos controlados en el
primer ensayo de rampa. Los valores de la tabla corresponden a la repetición.

## Seguridad — S2 / CP-RNF03-03

**Sin alertas de riesgo alto.** Con ZAP 2.17.0 se ejecutaron el escaneo base
(`Desarrollo/security/zap/run.sh`) y el **escaneo activo**
(`Desarrollo/security/zap/active.sh`, `zap-full-scan.py`) contra el frontend
(4292) y la API (8092) del stack aislado. En la API, el escaneo activo usó la
sesión de la auxiliar de la base demo, de modo que también atacó las rutas del
personal (agenda, reportes, historial, odontólogos), además de las públicas
(disponibilidad, catálogos, enlace de gestión).

| Escaneo | Objetivo | Alto | Medio | Bajo | Informativo | Reglas superadas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Base | Frontend | 0 | 4 | 5 | 4 | — |
| Base | API | 0 | 0 | 1 | 1 | — |
| Activo | Frontend | 0 | 4 | 5 | 6 | 135 |
| Activo | API (con sesión) | 0 | 1 | 1 | 2 | 140 |

Las reglas activas superadas incluyen inyección SQL, NoSQL y de comandos del
sistema, inyección de plantillas del servidor, XSS reflejado y persistente y
recorrido de rutas. Se cuentan las entradas de alerta por riesgo, no el número
de URLs afectadas. Registro de las alertas medias, sin cambios en la aplicación:

| ID de ZAP | Alerta | Justificación o corrección propuesta |
| --- | --- | --- |
| 10055 | Directivas CSP sin alternativa | Aparece en las respuestas 404 de `robots.txt` y `sitemap.xml` del servidor de desarrollo; validar una política explícita para documentos HTML y páginas de error en el servidor de entrega. |
| 10038 | Falta el encabezado CSP | Probar una política en modo de reporte y, tras validarla, aplicarla a la página principal (encabezados de Vercel). |
| 10020 | Falta protección contra clickjacking | Establecer `frame-ancestors 'none'` si el sitio no necesita permitir incrustaciones. |
| 90003 | Falta integridad de subrecursos | La entrada observada corresponde al servidor de desarrollo; verificar los recursos de la compilación de entrega y aplicar SRI a scripts estáticos externos cuando corresponda. |
| 40042 | Fuga de información de Spring Actuator (API) | Justificada: solo se expone `/actuator/health` y responde `{"status":"UP"}`, a propósito, para la verificación de salud del hosting; ningún otro endpoint de Actuator está publicado. |

Informes: escaneo base del frontend [HTML](rnf03-03-baseline-frontend.html) y
[JSON](rnf03-03-baseline-frontend.json), de la API
[HTML](rnf03-03-baseline-api.html) y [JSON](rnf03-03-baseline-api.json);
escaneo activo del frontend [HTML](rnf03-03-active-frontend.html) y
[JSON](rnf03-03-active-frontend.json), de la API
[HTML](rnf03-03-active-api.html) y [JSON](rnf03-03-active-api.json).

## Compatibilidad y accesibilidad — S4

- **CP-RNF01-02:** el agendamiento del paciente y el ingreso del personal se
  completan sin desbordamiento horizontal en **Chromium, Firefox y WebKit**, en
  escritorio (1366 × 768) y celular (360 × 640): 6 de 6. Chromium representa a
  Chrome y Edge. WebKit no arranca directamente en el equipo de desarrollo (Arch
  Linux con ICU 78; el WebKit de Playwright pide `libicui18n.so.74`), así que se
  ejecutó dentro de la imagen oficial `mcr.microsoft.com/playwright:v1.65.1-noble`
  con `Desarrollo/e2e/webkit.sh`: 2 de 2 (escritorio 13,7 s, celular 8,5 s).
  Chromium y Firefox: `Desarrollo/e2e/run.sh`.
- **CP-RNF02-02:** axe-core (`@axe-core/playwright` 4.14.1, WCAG 2.0, 2.1 y 2.2
  A y AA) sobre la página principal, los tres pasos del agendamiento, la página
  de gestión por enlace y el ingreso del personal, más un agendamiento completo
  solo con teclado y foco visible: pasa. axe encontró y se corrigió una violación
  seria (WCAG 2.5.3): el nombre accesible del enlace del logo («Villadent, ir al
  inicio») no contenía su texto visible «AgendaPro». La revisión manual con lector
  de pantalla (parte M del caso) la ejecuta QA.

## Disponibilidad — S3

**PASS de la prueba local del monitor; disponibilidad real pendiente.** Se
ejecutó `health-monitor.sh http://127.0.0.1:8092/actuator/health 5` durante dos
minutos, con un reloj simulado dentro del horario de atención y peticiones
reales a la API. `summary.sh monitor-smoke.csv` registró 24/24 respuestas 200
(100 %; latencia máxima de 4,167 ms). Fuera del horario, la ejecución con el
reloj real no generó muestras. En otra prueba, con intervalo de un segundo,
se inyectó un fallo de conexión seguido de peticiones reales: el monitor
registró HTTP 000, recuperó HTTP 200 y anotó 1 s de recuperación. No se midió
el arranque en frío de un proveedor de hosting.

Datos: [sondeo](monitor-smoke.csv) y [recuperación](monitor-recovery-smoke.csv).
