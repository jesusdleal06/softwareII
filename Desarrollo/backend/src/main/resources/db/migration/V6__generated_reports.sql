CREATE TABLE reportes_generados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    desde DATE NOT NULL,
    hasta DATE NOT NULL CHECK (hasta >= desde),
    id_odontologo BIGINT REFERENCES odontologos (id_odontologo) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    generado_en TIMESTAMPTZ NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL
);

CREATE INDEX reportes_generados_recientes_idx ON reportes_generados (generado_en DESC, id DESC);
