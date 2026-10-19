# Backend — Villadent AgendaPro

API y lógica de negocio del sistema de agendamiento y recordatorios del Centro Odontológico Villadent.

**Stack:** Java 21 · Spring Boot 4.1.2 · JPA (Hibernate) · Flyway · Spring Security (OAuth2 Resource Server) · PostgreSQL · Gradle 9.8.1

> **Nota sobre la versión:** `build.gradle` usa `4.1.2-SNAPSHOT`, que se descarga de `repo.spring.io/snapshot`. Un snapshot no es una versión publicada: puede cambiar sin aviso. Cuando salga la versión estable conviene fijarla.

---

## Requisitos

- **JDK 21** (Gradle viene por el wrapper, no hay que instalarlo)
- **Docker** con Docker Compose (para la base de datos de desarrollo y para las pruebas)

## Entorno de desarrollo

### 1. Base de datos

```bash
cd Desarrollo/backend
docker compose up -d
```

Levanta PostgreSQL en **`localhost:5434`**:

| Dato               | Valor                            |
| ------------------ | -------------------------------- |
| Base de datos      | `villadent`                      |
| Usuario            | `villadent`                      |
| Contraseña         | `villadent` (solo desarrollo)     |
| Puerto en el host  | `5434`                           |

El puerto no es el 5432 por una razón concreta: **el 5432 y el 5433 de esta máquina ya los ocupan otros proyectos locales**, así que este entorno usa uno libre para no chocar con ellos.

Detener la base: `docker compose down`. Borrar además los datos guardados: `docker compose down -v`.

### 2. Aplicación

```bash
./gradlew bootRun
```

La conexión se configura en `src/main/resources/application.properties`, y los valores por defecto ya coinciden con el `docker-compose.yml`, así que no hay que tocar nada para el flujo local. Para apuntar a otra base (por ejemplo Neon) se sobreescriben con variables de entorno:

```bash
DB_URL=jdbc:postgresql://host:5432/base DB_USER=usuario DB_PASSWORD=clave ./gradlew bootRun
```

#### Recarga en caliente (opcional)

`./gradlew bootRun` **no recompila** cuando guardas un archivo: Spring ejecuta clases ya compiladas. Para que un cambio en un `.java` reinicie la aplicación automáticamente, deja Gradle recompilando en bucle en una segunda terminal:

```bash
./gradlew -t classes
```

Cada guardado recompila, y `spring-boot-devtools` (ya incluido como dependencia de desarrollo) reinicia el contexto en un par de segundos. Sin esa segunda terminal hay que reiniciar `bootRun` a mano cada vez. En IntelliJ IDEA se consigue lo mismo activando la compilación automática del proyecto.

Los logs de la aplicación salen en la terminal donde corre `bootRun`. Si prefieres un archivo, redirige la salida a `build/` (que está ignorado por git) y síguela con `tail`:

```bash
./gradlew bootRun --console=plain > build/app.log 2>&1
```

### 3. Pruebas

```bash
./gradlew test
```

Las pruebas de integración levantan su **propio** PostgreSQL con Testcontainers (no usan el de `docker-compose.yml`), así que necesitan Docker, pero no tener la base de desarrollo arriba. La versión de PostgreSQL está fijada igual en ambos lados para que desarrollo y pruebas no se separen.

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

La carpeta está vacía todavía: el primer cambio de esquema del proyecto será `V1`.
