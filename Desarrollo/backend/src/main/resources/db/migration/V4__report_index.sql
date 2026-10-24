-- RF10: administrative reports filter the month by date, with an optional
-- dentist. The existing (id_odontologo, fecha) index does not serve the
-- unfiltered range, so add a date index.
CREATE INDEX citas_fecha_idx ON citas (fecha);
