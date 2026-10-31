-- Password reset magic-link tokens (hashed). Preserve legacy users without email.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash
  ON password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

-- A NOT VALID check preserves existing incomplete rows, while enforcing email on
-- every new insert/update. Do not invent addresses or block an existing DB upgrade.
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
