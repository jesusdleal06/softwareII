# Backend — Villadent AgendaPro

API y lógica de negocio del sistema de agendamiento y recordatorios del Centro Odontológico Villadent.

**Stack:** Java 21 · Spring Boot 4.1.2 · JPA (Hibernate) · Flyway · Spring Security (OAuth2 Resource Server) · PostgreSQL · Gradle 9.8.1

> **Nota sobre la versión:** `build.gradle` usa la versión estable `4.1.2`, publicada en Maven Central; los repositorios de snapshots fueron eliminados.

---

## Requisitos

- **Docker** con Docker Compose: la única herramienta obligatoria, porque el contenedor trae el JDK 21 y Gradle.
- **JDK 21** solo si prefieres compilar en tu propia máquina (ver «Alternativa», más abajo).

## Entorno de desarrollo

El compose levanta **la base de datos y la API**, igual que el del frontend: un solo comando.

```bash
cd Desarrollo/backend
docker compose up -d
```

- API en <http://localhost:8080> — `/actuator/health` y `/api/v1/public/**` responden sin sesión; el resto exige un JWT (`401` sin token, `403` con el rol equivocado).
- PostgreSQL en `localhost:5434`.

La **primera vez tarda unos minutos**: dentro del contenedor se descargan las dependencias de Spring. Quedan guardadas en el volumen `gradle-cache`, así que los siguientes arranques son de segundos (medido: 16 s desde `docker compose up -d` hasta la aplicación lista). Para seguirlo mientras tanto:

```bash
docker compose logs -f app
```

### Recarga en caliente

El contenedor deja `./gradlew -t classes` recompilando en segundo plano, y `spring-boot-devtools` reinicia el contexto cuando cambian las clases. Guardas un `.java` y la aplicación se reinicia sola, sin reiniciar contenedores: medido en este entorno, `Restarting due to 1 class path change` y arranque en **0.374 s**, más unos segundos de recompilación.

### Base de datos

| Dato               | Valor                            |
| ------------------ | -------------------------------- |
| Base de datos      | `villadent`                      |
| Usuario            | `villadent`                      |
| Contraseña         | `villadent` (solo desarrollo)     |
| Puerto en el host  | `5434`                           |

El puerto no es el 5432 por una razón concreta: **el 5432 y el 5433 de esta máquina ya los ocupan otros proyectos locales**, así que este entorno usa uno libre para no chocar con ellos.

Dentro de la red de compose la aplicación se conecta a `postgres:5432`, no al puerto del host; por eso el compose define `DB_URL`. Es el mismo mecanismo que usaría un despliegue real.

Apagar: `docker compose down` (conserva datos y caché de Gradle). Borrar además ambos: `docker compose down -v`.

### Alternativa: la aplicación en tu máquina

Si prefieres no esperar la descarga inicial dentro del contenedor, levanta solo la base y compila con tu propio JDK:

```bash
docker compose up -d postgres
./gradlew bootRun
```

Los valores por defecto de `application.properties` ya apuntan a `localhost:5434`, así que no hay que configurar nada. Para apuntar a otra base (por ejemplo Neon) se sobreescriben con variables de entorno:

```bash
DB_URL=jdbc:postgresql://host:5432/base DB_USER=usuario DB_PASSWORD=clave ./gradlew bootRun
```

En este modo la recarga en caliente necesita la segunda terminal (`./gradlew -t classes`) o la compilación automática de IntelliJ, porque `bootRun` por sí solo no recompila al guardar.

**No uses las dos formas a la vez**: ambas publican el puerto 8080.

### Primer usuario y JWT

Solo un `AUXILIAR` puede crear usuarios, así que la primera cuenta se crea al arrancar desde variables de entorno:

```bash
BOOTSTRAP_ADMIN_EMAIL=ana@villadent.co \
BOOTSTRAP_ADMIN_PASSWORD='una-clave-de-al-menos-12-caracteres' \
BOOTSTRAP_ADMIN_NAME='Ana María Rueda' \
./gradlew bootRun
```

- La cuenta solo se crea si **no existe ningún `AUXILIAR` activo**; si el correo ya existe, nunca se le cambia la contraseña.
- Sin `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` el arranque no falla: avisa y no crea nada.
- Una contraseña de menos de 12 caracteres detiene el arranque con un error claro.
- La contraseña se guarda como hash BCrypt y nunca se escribe en los logs.
- `app.bootstrap-admin.enabled=false` desactiva el mecanismo (las pruebas de integración lo usan).

El login es `POST /api/v1/auth/login` con `{"email":"...","password":"..."}`. Devuelve un JWT HS256 de 8 horas firmado con `JWT_SECRET` (mínimo 32 bytes). En desarrollo hay un secreto por defecto; en cualquier otro entorno hay que definirlo.

### Datos de demostración

Con el perfil `demo` se cargan los mismos odontólogos, horarios (08:00–12:00 y 14:00–18:00, lunes a sábado), procedimientos y usuarios del prototipo Angular. El sembrado usa los casos de uso, no SQL, y es idempotente: se puede arrancar varias veces sin duplicar datos. Solo existe en este perfil.

```bash
SPRING_PROFILES_ACTIVE=demo ./gradlew bootRun
```

Credenciales **solo para la demostración**:

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `ana@villadent.co` | `villadent2024` | `AUXILIAR` |
| `laura@villadent.co` | `villadent2024` | `ODONTOLOGO` |

### Pruebas

```bash
./gradlew test
```

Las pruebas de integración levantan su **propio** PostgreSQL con Testcontainers (no usan el de `docker-compose.yml`), así que necesitan Docker, pero no tener la base de desarrollo arriba. La versión de PostgreSQL está fijada igual en ambos lados para que desarrollo y pruebas no se separen.

### Endpoints de esta entrega

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Público |
| `GET` | `/api/v1/public/dentists` | Público, solo activos |
| `GET` | `/api/v1/public/procedures` | Público, solo activos |
| `GET` | `/api/v1/public/availability?dentistId=&date=&procedureId=` | Público; devuelve solo franjas libres |
| `GET/POST/PATCH` | `/api/v1/users/**` | `AUXILIAR`; lectura también para `ODONTOLOGO` |
| `GET/POST/PATCH` | `/api/v1/dentists/**` | `AUXILIAR`; lectura también para `ODONTOLOGO` |
| `GET/POST/PATCH` | `/api/v1/procedures/**` | `AUXILIAR`; lectura también para `ODONTOLOGO` |
| `GET/POST/PATCH` | `/api/v1/patients/**` | `AUXILIAR`; lectura también para `ODONTOLOGO` |
| `GET` | `/api/v1/reports/**` | `AUXILIAR` |

---

## Estructura

```
src/main/java/co/edu/unipamplona/villadent/   # Aplicación Spring Boot
src/main/resources/application.properties     # Datasource, JPA y Flyway
src/main/resources/db/migration/              # Migraciones Flyway (versionadas en git)
src/test/java/co/edu/unipamplona/villadent/   # Pruebas
```

### Migraciones

El esquema lo construye **Flyway** a partir de `src/main/resources/db/migration/`, con nombres `V1__descripcion.sql`, `V2__…`. Hibernate corre con `ddl-auto=validate`: **nunca** altera el esquema por su cuenta, solo comprueba que las entidades coincidan con lo que las migraciones crearon. Si agregas una entidad sin su migración, el arranque falla a propósito: así el esquema siempre queda versionado.

La primera migración es `V1__initial_schema.sql`: crea todas las tablas del modelo, el índice de agenda por odontólogo y fecha, y la restricción `citas_sin_cruce` que impide dobles reservas en PostgreSQL.
