BEGIN;

-- A stable 365-day period, about 15 appointments on each populated day:
-- 266 full days and a final partial day (4000 = 266*15 + 10).
CREATE TEMP TABLE volume_fixture ON COMMIT DROP AS
SELECT n, '3005' || lpad(n::text, 6, '0') AS phone,
       date '2025-01-01' + ((n - 1) / 15 * 365 / 267) AS day,
       CASE WHEN (n - 1) % 15 < 8
            THEN time '08:00' + (n - 1) % 15 * interval '30 minutes'
            ELSE time '14:00' + ((n - 1) % 15 - 8) * interval '30 minutes'
       END AS start_time
FROM generate_series(1, 4000) AS g(n);

INSERT INTO pacientes (nombre_completo, telefono)
SELECT 'Synthetic volume ' || n, phone FROM volume_fixture
ON CONFLICT (telefono) DO NOTHING;

INSERT INTO citas (codigo, id_paciente, id_odontologo, id_procedimiento,
                   fecha, hora, duracion_min, estado, origen)
SELECT 'VOL-' || f.n, p.id_paciente, d.id_odontologo, pr.id_procedimiento,
       f.day, f.start_time, 30, 'ATENDIDA', 'MANUAL'
FROM volume_fixture f
JOIN pacientes p ON p.telefono = f.phone AND p.nombre_completo = 'Synthetic volume ' || f.n
CROSS JOIN (SELECT min(id_odontologo) AS id_odontologo FROM odontologos WHERE activo) d
CROSS JOIN (SELECT min(id_procedimiento) AS id_procedimiento
            FROM procedimientos WHERE activo AND duracion_min = 30) pr
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
