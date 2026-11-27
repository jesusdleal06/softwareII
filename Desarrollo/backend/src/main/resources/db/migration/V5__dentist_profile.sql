-- An ordered array keeps titles with their profile and supports atomic replacement without deleting child rows.
ALTER TABLE odontologos
    ADD COLUMN IF NOT EXISTS primer_nombre TEXT,
    ADD COLUMN IF NOT EXISTS segundo_nombre TEXT,
    ADD COLUMN IF NOT EXISTS primer_apellido TEXT,
    ADD COLUMN IF NOT EXISTS segundo_apellido TEXT,
    ADD COLUMN IF NOT EXISTS foto_url TEXT,
    ADD COLUMN IF NOT EXISTS foto_public_id TEXT,
    ADD COLUMN IF NOT EXISTS titulos_academicos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500),
    ALTER COLUMN nombre TYPE TEXT;

WITH legacy AS (
    SELECT id_odontologo, nombre,
           regexp_split_to_array(
               btrim(regexp_replace(
                   regexp_replace(nombre, '^[[:space:]]*Dra?[.][[:space:]]*', '', 'i'),
                   '[[:space:]]+', ' ', 'g')),
               ' ') AS parts
    FROM odontologos
    WHERE primer_nombre IS NULL
), split AS (
    SELECT id_odontologo, parts[1] <> '' AS has_name,
           COALESCE(NULLIF(parts[1], ''),
                    regexp_replace(nombre, '^[[:space:]]+|[[:space:]]+$', '', 'g')) AS first_name,
           CASE WHEN cardinality(parts) >= 4
               THEN array_to_string(parts[2:cardinality(parts)-2], ' ') END AS second_name,
           CASE WHEN cardinality(parts) = 2 THEN parts[2]
                WHEN cardinality(parts) >= 3 THEN parts[cardinality(parts)-1] END AS first_surname,
           CASE WHEN cardinality(parts) >= 3 THEN parts[cardinality(parts)] END AS second_surname
    FROM legacy
)
UPDATE odontologos AS dentist
SET primer_nombre = split.first_name,
    segundo_nombre = split.second_name,
    primer_apellido = split.first_surname,
    segundo_apellido = split.second_surname,
    nombre = CASE WHEN split.has_name
        THEN concat_ws(' ', split.first_name, split.second_name, split.first_surname, split.second_surname)
        ELSE dentist.nombre END
FROM split
WHERE dentist.id_odontologo = split.id_odontologo;
