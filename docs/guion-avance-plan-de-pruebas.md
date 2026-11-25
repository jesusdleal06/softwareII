# Guion: avance del plan de pruebas de Villadent

Duración sugerida: 6 a 8 minutos. Cada bloque trae lo que se dice y, al lado, qué mostrar del documento.

---

## 1. De qué trata el avance (30 s)

> «Este es el avance del plan de pruebas del sistema de agendamiento y recordatorio de citas del Centro Odontológico Villadent. Sigue la norma ISO/IEC/IEEE 29119-3 y hoy les muestro tres cosas: qué vamos a probar, cómo lo probamos y qué evidencia ya tenemos de cada prueba.»

**Mostrar:** la portada del plan y el control de versiones (sección 0, versión 1.3).

---

## 2. Qué se prueba (1 min)

> «El plan tiene 54 casos de prueba: 39 funcionales, que cubren los requisitos RF01 a RF10, y 15 no funcionales, para RNF01 a RNF04. Cada caso tiene un código, por ejemplo CP-RF03-02, que lo amarra a su requisito. Así, en la matriz de trazabilidad se ve que todos los requisitos tienen al menos un caso.»

Si pregunta por qué no hay casos de RNF05: es una restricción de diseño (arquitectura y despliegue) y se verifica revisando el despliegue al cierre de cada ciclo, como dice la sección 4.2.

**Mostrar:** la sección 12 (una tabla de casos) y la sección 13 (matriz de trazabilidad).

---

## 3. Cómo se prueba (1 min 30 s)

> «La sección 6 organiza las pruebas como las vimos en clase.»

| Grupo | Qué decir en una frase |
|---|---|
| Niveles | Unitarias, integración (ascendente en el backend y descendente en el frontend), sistema y aceptación: UAT, alfa, beta, contractual y regulatoria. |
| Técnicas | Caja blanca (sentencias, ramas y caminos), caja negra (particiones, valores límite, tablas de decisión y transición de estados) y caja gris. |
| Funcionales y tras un cambio | Humo, cordura, end-to-end, interfaz, API, confirmación, regresión y mantenimiento. |
| No funcionales (ISO/IEC 25010) | Desempeño, fiabilidad, seguridad (OWASP), accesibilidad (WCAG), compatibilidad, portabilidad y localización. |
| Formas de ejecución | Estáticas frente a dinámicas, manuales frente a automatizadas, exploratorias, basadas en riesgo, mutación, TDD, BDD, shift-left y shift-right. |

> «Probamos en paralelo con el desarrollo: cada prueba automatizada lleva en su nombre el código del caso, y un requisito solo se da por terminado cuando sus casos pasan.»

**Mostrar:** la tabla de la sección 6.4 (ISO/IEC 25010).

---

## 4. La evidencia: lo más importante del avance (2 min)

> «Ya hay evidencia real en 45 de los 54 casos. Todo se ejecutó el 19 de noviembre en un ambiente local con Docker, aislado y con datos ficticios, nunca con datos de pacientes reales.»

Debajo de la tabla de cada requisito hay un bloque «Evidencias de ejecución» con tres tipos de imagen:

1. **Resultado de las pruebas automatizadas** (39 casos). «Ejecutamos la suite completa del backend: 187 pruebas, 0 fallidas. Cada imagen muestra las pruebas de ese caso y su resultado, sacados del reporte JUnit.»
2. **Capturas de la aplicación** (18 casos). «Las tomamos con Playwright siguiendo los pasos de cada caso: el agendamiento en 3 pasos, el horario ocupado que desaparece, el bloqueo de 60 minutos por una exodoncia, el mensaje cuando falta el celular, el enlace de gestión inválido, el acceso denegado por rol, la cita manual que aparece en la agenda y los reportes.»
3. **Salida de herramientas** (pruebas no funcionales):
   - **Compatibilidad:** el flujo funciona en Chromium, Firefox y WebKit (el motor de Safari), en escritorio y en celular.
   - **Accesibilidad:** axe-core revisó 5 pantallas con las reglas WCAG 2.2 AA, y se agendó una cita usando solo el teclado.
   - **Seguridad:** una prueba de penetración manual con 15 ataques (sin sesión, token alterado, rol equivocado, enlaces adivinados, inyección SQL), Semgrep sobre todo el código y `pnpm audit` sobre las dependencias.

**Mostrar:** RF07 (agendamiento en 3 pasos), RF05 (una imagen de prueba automatizada) y el bloque de no funcionales.

---

## 5. Qué encontraron las pruebas (1 min)

> «Probar sirve para encontrar problemas, y estas pruebas ya encontraron algunos:»

- **Accesibilidad:** axe marca 2 fallas graves en el paso 3 del agendamiento: la lista con el resumen de la cita está mal estructurada para los lectores de pantalla. El resto de pantallas no tiene fallas y el uso con teclado funciona completo.
- **Dependencias:** `pnpm audit` encuentra 6 vulnerabilidades altas. Cinco son de herramientas de desarrollo; una (`zod`, que entra a través de Angular Forms) llega a la aplicación publicada.
- **Seguridad:** la prueba de penetración rechazó los 15 ataques y Semgrep no encontró hallazgos en 419 archivos.

> «Estos hallazgos se registran como defectos según la sección 12.3, y luego se hace la prueba de confirmación cuando se corrijan.»

---

## 6. Qué falta (45 s)

> «Este es un avance. Faltan 9 casos, y el plan explica por qué:»

| Casos | Por qué faltan |
|---|---|
| CP-RNF01-01 y CP-RNF02-01 | Necesitan personas: el computador de la clínica y tres pacientes, una adulta mayor, agendando sin ayuda. |
| CP-RNF03-03 | El escaneo dinámico con OWASP ZAP se empezó pero no alcanzó a terminar. |
| CP-RNF04-01 a 06 | Las pruebas de desempeño con k6 (rendimiento, carga, estrés, picos, volumen y resistencia) ya están preparadas; la de resistencia dura 2 horas. |

> «Los estados de la matriz (sección 13) y el informe de resultados (sección 14) los diligencia el QA cuando termine la ejecución completa.»

---

## 7. Cierre (15 s)

> «En resumen: el plan define qué y cómo se prueba, el 83 % de los casos ya tiene evidencia real y las pruebas ya encontraron defectos que vamos a corregir. El siguiente paso es ejecutar los 9 casos pendientes y registrar los defectos.»

---

## Preguntas que pueden salir

- **¿Las capturas son reales?** Sí. Salen de ejecuciones del 19/11/2026 contra el sistema corriendo en Docker. Las de pruebas automatizadas se generaron del reporte JUnit de esa misma corrida.
- **¿Por qué datos ficticios?** Por protección de datos (Ley 1581 de 2012): el plan exige usar solo pacientes ficticios y teléfonos del equipo. El ambiente de prueba no tiene credenciales de WhatsApp, así que no se envió ningún mensaje.
- **¿Por qué no se borró ningún caso pendiente?** Porque borrar un caso cambia los requisitos del plan. Solo se quitaron los recuadros vacíos de esta versión de avance.
- **¿Qué es un caso automatizado frente a uno manual?** La columna «Nivel» lo indica: U (unitaria), I (integración) y E2E se automatizan; M es manual porque necesita juicio humano o acceso directo al ambiente.
