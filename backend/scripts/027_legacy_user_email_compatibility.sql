-- Align environments where the original 025 already imposed NOT NULL.
-- Existing rows are untouched. New writes still require a non-blank email.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND conname = 'users_email_required'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_required
      CHECK (email IS NOT NULL AND length(btrim(email)) > 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
