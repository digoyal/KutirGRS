-- Password reset magic-link tokens (hashed) + require users.email when no blanks remain.
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

-- Safe only when every user already has a non-blank email (verified before shipping).
ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;
