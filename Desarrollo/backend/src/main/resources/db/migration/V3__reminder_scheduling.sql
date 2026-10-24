-- RF05: at most one pending reminder per appointment and a fast due-reminder lookup.
ALTER TABLE recordatorios DROP CONSTRAINT recordatorios_estado_envio_check;
ALTER TABLE recordatorios ADD CONSTRAINT recordatorios_estado_envio_check
    CHECK (estado_envio IN ('PROGRAMADO', 'ENVIADO', 'FALLIDO', 'CANCELADO'));

CREATE UNIQUE INDEX recordatorios_programado_unico
    ON recordatorios (id_cita)
    WHERE estado_envio = 'PROGRAMADO';

CREATE INDEX recordatorios_pendientes_idx
    ON recordatorios (estado_envio, programado_para);
