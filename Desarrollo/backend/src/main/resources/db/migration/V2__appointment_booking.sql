-- Appointment booking (RF04, RF07, RF08).
-- The public code comes from a sequence so two concurrent bookings cannot pick
-- the same VD-#### value.
CREATE SEQUENCE citas_codigo_seq START WITH 1001;

-- A manage link does not exist until the reminder is sent (cycle 3). The raw
-- token is never stored; the reminder will write only its SHA-256 hash.
ALTER TABLE citas ALTER COLUMN token_gestion_hash DROP NOT NULL;
