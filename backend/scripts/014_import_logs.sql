-- Migration 014: import_logs table
-- Persists each data-import run so admins can review history.

CREATE TABLE IF NOT EXISTS import_logs (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filename    TEXT,
    imported_by TEXT,                          -- username of the admin who ran it
    results     JSONB NOT NULL DEFAULT '[]',   -- array of SheetResult objects
    totals      JSONB NOT NULL DEFAULT '{}'    -- {total, created, skipped, errors}
);

CREATE INDEX IF NOT EXISTS ix_import_logs_created_at ON import_logs (created_at DESC);
