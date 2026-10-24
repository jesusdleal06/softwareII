-- Villadent AgendaPro - initial schema
-- Source of truth: Desarrollo/backend/docs/development-prompt.md section 6.
-- Flyway owns the schema: Hibernate runs with ddl-auto=validate and never
-- creates or alters tables.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE roles (
    id_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT usuarios_rol_fk FOREIGN KEY (id_rol) REFERENCES roles (id_rol) ON DELETE RESTRICT
);

CREATE TABLE odontologos (
    id_odontologo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255),
    id_usuario BIGINT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT odontologos_usuario_fk FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    CONSTRAINT odontologos_usuario_unique UNIQUE (id_usuario)
);

CREATE TABLE horarios_odontologo (
    id_horario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_odontologo BIGINT NOT NULL,
    dia_semana INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT horarios_odontologo_odontologo_fk FOREIGN KEY (id_odontologo) REFERENCES odontologos (id_odontologo) ON DELETE RESTRICT,
    CONSTRAINT horarios_odontologo_check CHECK (dia_semana BETWEEN 1 AND 7 AND hora_fin > hora_inicio)
);

CREATE TABLE procedimientos (
    id_procedimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    duracion_min INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT procedimientos_duracion_check CHECK (duracion_min IN (30, 45, 60, 90))
);

CREATE TABLE pacientes (
    id_paciente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pacientes_telefono_check CHECK (telefono ~ '^3[0-9]{9}$')
);

CREATE TABLE citas (
    id_cita BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    id_paciente BIGINT NOT NULL,
    id_odontologo BIGINT NOT NULL,
    id_procedimiento BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_min INT NOT NULL,
    estado VARCHAR(20) NOT NULL,
    origen VARCHAR(10) NOT NULL,
    token_gestion_hash VARCHAR(64) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT citas_paciente_fk FOREIGN KEY (id_paciente) REFERENCES pacientes (id_paciente) ON DELETE RESTRICT,
    CONSTRAINT citas_odontologo_fk FOREIGN KEY (id_odontologo) REFERENCES odontologos (id_odontologo) ON DELETE RESTRICT,
    CONSTRAINT citas_procedimiento_fk FOREIGN KEY (id_procedimiento) REFERENCES procedimientos (id_procedimiento) ON DELETE RESTRICT,
    CONSTRAINT citas_estado_check CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA', 'CANCELADA', 'ATENDIDA', 'NO_ASISTIO')),
    CONSTRAINT citas_origen_check CHECK (origen IN ('WEB', 'MANUAL'))
);

CREATE TABLE recordatorios (
    id_recordatorio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita BIGINT NOT NULL,
    canal VARCHAR(20) NOT NULL,
    programado_para TIMESTAMPTZ NOT NULL,
    fecha_envio TIMESTAMPTZ,
    estado_envio VARCHAR(20) NOT NULL,
    intentos INT NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT recordatorios_cita_fk FOREIGN KEY (id_cita) REFERENCES citas (id_cita) ON DELETE RESTRICT,
    CONSTRAINT recordatorios_canal_check CHECK (canal = 'WHATSAPP'),
    CONSTRAINT recordatorios_estado_envio_check CHECK (estado_envio IN ('PROGRAMADO', 'ENVIADO', 'FALLIDO'))
);

-- Agenda reads filter by dentist and day: 15 appointments a day must answer in
-- under 2 seconds (RNF04). Patient history and the active-appointment rule look
-- appointments up by patient (section 9).
CREATE INDEX citas_odontologo_fecha_idx ON citas (id_odontologo, fecha);
CREATE INDEX citas_paciente_idx ON citas (id_paciente);

-- No double booking, enforced by the database (CP-RF07-03, CP-RF08-02).
-- The overlapping interval is the appointment slot: [fecha + hora, fecha + hora + duracion_min).
ALTER TABLE citas
    ADD CONSTRAINT citas_sin_cruce EXCLUDE USING gist (
        id_odontologo WITH =,
        tsrange(fecha + hora, fecha + hora + make_interval(mins => duracion_min)) WITH &&
    ) WHERE (estado IN ('PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'));

-- Staff roles seeded for the login flow (RF09).
INSERT INTO roles (nombre_rol) VALUES ('AUXILIAR'), ('ODONTOLOGO');
