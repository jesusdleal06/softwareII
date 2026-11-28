CREATE TABLE codigos_verificacion (
    id_codigo BIGSERIAL NOT NULL,
    telefono VARCHAR(10) NOT NULL,
    hash_codigo VARCHAR(64) NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    intentos INTEGER NOT NULL DEFAULT 0,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    invalidado BOOLEAN NOT NULL DEFAULT FALSE,
    ip_cliente VARCHAR(45),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT codigos_verificacion_pk PRIMARY KEY (id_codigo)
);

CREATE INDEX codigos_verificacion_telefono_idx
    ON codigos_verificacion (telefono, creado_en);

CREATE INDEX codigos_verificacion_ip_idx
    ON codigos_verificacion (ip_cliente, creado_en);

CREATE TABLE tokens_verificacion (
    id_token BIGSERIAL NOT NULL,
    hash_token VARCHAR(64) NOT NULL,
    telefono VARCHAR(10) NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    usado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tokens_verificacion_pk PRIMARY KEY (id_token),
    CONSTRAINT tokens_verificacion_hash_uk UNIQUE (hash_token)
);

CREATE INDEX tokens_verificacion_telefono_idx
    ON tokens_verificacion (telefono);
