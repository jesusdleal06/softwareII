CREATE TABLE procedimiento_odontologos (
    id_procedimiento BIGINT NOT NULL,
    id_odontologo BIGINT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT procedimiento_odontologos_pk PRIMARY KEY (id_procedimiento, id_odontologo),
    CONSTRAINT procedimiento_odontologos_procedimiento_fk FOREIGN KEY (id_procedimiento)
        REFERENCES procedimientos (id_procedimiento) ON DELETE RESTRICT,
    CONSTRAINT procedimiento_odontologos_odontologo_fk FOREIGN KEY (id_odontologo)
        REFERENCES odontologos (id_odontologo) ON DELETE RESTRICT
);

CREATE INDEX procedimiento_odontologos_odontologo_idx
    ON procedimiento_odontologos (id_odontologo);

INSERT INTO procedimiento_odontologos (id_procedimiento, id_odontologo)
SELECT procedimiento.id_procedimiento, odontologo.id_odontologo
FROM procedimientos procedimiento
CROSS JOIN odontologos odontologo;
