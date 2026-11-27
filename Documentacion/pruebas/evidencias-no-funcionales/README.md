# Evidencias de pruebas no funcionales — T1

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
| CP-RNF04-03 | `Desarrollo/perf/run.sh ramp` | 20→200 usuarios en 5 min; p95 máximo por ventana de 10 s **87,01 ms**, sin cruce de 2 s ni errores. Al minuto de terminar la carga: **4,15 ms** (HTTP 200); 16.450 respuestas 201, 16.450 citas persistidas y 0 turnos duplicados. | **FAIL: no se identificó el límite ni se observó comportamiento más allá de él** |
| CP-RNF04-04 | `Desarrollo/perf/run.sh burst` | 1→45 usuarios en 10 s; p95 de la ráfaga **7,63 ms**, 0 fallos en 135 solicitudes medidas, 45 confirmaciones. La preparación no se incluye en el percentil. | **PASS** |
| CP-RNF04-05 | `Desarrollo/perf/run.sh volume` | 4.000 citas ficticias en 2025, hasta 15 por fecha poblada. Agenda: HTTP 200, 15 registros, **76,59 ms**; informe anual: HTTP 200, 4.000 registros, **65,02 ms**. | **PASS** |
| CP-RNF04-06 | `SOAK_DURATION=3m Desarrollo/perf/run.sh soak` | 5 usuarios, 3 min; p95 del intervalo parcial **25,45 ms**, 0 fallos en 452 solicitudes (incluidas dos de preparación). Memoria: 1.016, 1.017, 1.018 y 1.018 MiB. | **PASS de humo; prueba de 2 h pendiente** |

Datos: [carga estable](rnf04-02-steady.json),
[rampa](rnf04-03-ramp.json), [integridad](rnf04-03-ramp-integrity.txt),
[ráfaga](rnf04-04-reminder-burst.json), [volumen](rnf04-05-volume.txt),
[prueba de humo](rnf04-06-soak.json) y [memoria](rnf04-06-soak-memory.csv).
Tres minutos no permiten comparar dos intervalos de 10 minutos ni evaluar
crecimiento sostenido de memoria.

La rampa y la ráfaga se repitieron con una base limpia tras corregir un
solapamiento de fechas que había generado 45 conflictos controlados en el
primer ensayo de rampa. Los valores de la tabla corresponden a la repetición.

## Seguridad — S2 / CP-RNF03-03

**FAIL por cobertura incompleta.** Se ejecutó
`Desarrollo/security/zap/run.sh` con ZAP 2.17.0. Los dos análisis base
generaron informes; el ejecutor devolvió código 2 por advertencias. No se
ejecutó el escaneo activo. El análisis pasivo de la API no autenticó usuarios.

| Objetivo | Alto | Medio | Bajo | Informativo |
| --- | ---: | ---: | ---: | ---: |
| Frontend | 0 | 4 | 5 | 4 |
| API | 0 | 0 | 1 | 1 |

Se cuentan las entradas de alerta del JSON por riesgo, no el número de URLs
afectadas. No hubo alertas altas en el alcance pasivo. Registro de las alertas
medias del frontend, sin cambios en la aplicación:

| ID de ZAP | Alerta | Justificación o corrección propuesta |
| --- | --- | --- |
| 10055 | Directivas CSP sin alternativa | Aparece en las respuestas 404 de `robots.txt` y `sitemap.xml` del servidor de desarrollo; validar una política explícita para documentos HTML y páginas de error en el servidor de entrega. |
| 10038 | Falta el encabezado CSP | Probar una política en modo de reporte y, tras validarla, aplicarla a la página principal. |
| 10020 | Falta protección contra clickjacking | Establecer `frame-ancestors 'none'` si el sitio no necesita permitir incrustaciones. |
| 90003 | Falta integridad de subrecursos | La entrada observada corresponde al servidor de desarrollo; verificar los recursos de la compilación de entrega y aplicar SRI a scripts estáticos externos cuando corresponda. |

Informes: frontend [HTML](rnf03-03-baseline-frontend.html) y
[JSON](rnf03-03-baseline-frontend.json); API [HTML](rnf03-03-baseline-api.html)
y [JSON](rnf03-03-baseline-api.json).

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
