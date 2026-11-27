-- Clinic working hours (S1): Monday to Friday 08:00-12:00 and 14:00-18:00,
-- Sunday 08:00-13:00, Saturday closed.
--
-- The rule is enforced in the domain (ClinicHours), so a database that already holds
-- Saturday rows would keep offering them: they are deactivated here, never deleted.
-- Every dentist without Sunday hours gets them, so the Sunday morning becomes bookable.
-- No appointment (citas) is deleted or moved by this migration.

UPDATE horarios_odontologo
   SET activo = FALSE
 WHERE dia_semana = 6
   AND activo;

INSERT INTO horarios_odontologo (id_odontologo, dia_semana, hora_inicio, hora_fin, activo)
SELECT odontologo.id_odontologo, 7, TIME '08:00', TIME '13:00', TRUE
  FROM odontologos odontologo
 WHERE NOT EXISTS (
       SELECT 1
         FROM horarios_odontologo horario
        WHERE horario.id_odontologo = odontologo.id_odontologo
          AND horario.dia_semana = 7
          AND horario.activo
 );
