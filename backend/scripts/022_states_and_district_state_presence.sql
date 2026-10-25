-- Migration 022: States lookup + district state_id and parivaar_presence
-- Recreates carefully after an aborted local attempt that dropped these objects.

CREATE TABLE IF NOT EXISTS states (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO states (name, created_at, updated_at)
VALUES
    ('Madhya Pradesh', now(), now()),
    ('Jharkhand', now(), now()),
    ('Chhattisgarh', now(), now())
ON CONFLICT (name) DO NOTHING;

ALTER TABLE districts
    ADD COLUMN IF NOT EXISTS state_id INTEGER REFERENCES states(id),
    ADD COLUMN IF NOT EXISTS parivaar_presence BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing operational districts imply Parivaar presence.
UPDATE districts SET parivaar_presence = TRUE;

-- Backfill state: GPM is Chhattisgarh; all other seeded districts are Madhya Pradesh.
UPDATE districts d
SET state_id = s.id
FROM states s
WHERE d.state_id IS NULL
  AND lower(d.name) = lower('Gaurela-Pendra-Marwahi')
  AND s.name = 'Chhattisgarh';

UPDATE districts d
SET state_id = s.id
FROM states s
WHERE d.state_id IS NULL
  AND s.name = 'Madhya Pradesh';

-- Require state once backfilled (safe if every district has a state_id).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM districts WHERE state_id IS NULL) THEN
    ALTER TABLE districts ALTER COLUMN state_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_districts_state_id ON districts (state_id);
