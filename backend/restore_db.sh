#!/bin/bash
# Rebuild kutirgrs_v2 from kutirgrs_v2_export.sql and bring the schema up to date
# with the current code. WARNING: drops and recreates the local database.
# Run from Mac terminal:  cd ~/projects/KutirGRS/backend && bash restore_db.sh
#
# Auth: uses PGPASSWORD if already set; otherwise reads the password from
# DATABASE_URL in backend/.env (never hardcode credentials in this file).
set -e
cd "$(dirname "$0")"

if [ -z "${PGPASSWORD:-}" ] && [ -f .env ]; then
  # Extract password from DATABASE_URL=scheme://user:password@host:port/db
  _db_url=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
  if [[ "$_db_url" =~ ://[^:]+:([^@]+)@ ]]; then
    export PGPASSWORD="${BASH_REMATCH[1]}"
  fi
fi
if [ -z "${PGPASSWORD:-}" ]; then
  echo "error: set PGPASSWORD or put DATABASE_URL with a password in backend/.env" >&2
  exit 1
fi

DB=kutirgrs_v2
PSQL="psql -h localhost -U postgres -v ON_ERROR_STOP=1 -q"

echo "→ Recreating database $DB"
dropdb -h localhost -U postgres --if-exists "$DB"
createdb -h localhost -U postgres "$DB"

echo "→ Restoring ../kutirgrs_v2_export.sql"
$PSQL -d "$DB" -f ../kutirgrs_v2_export.sql >/dev/null

echo "→ Applying pre-numbered migrations"
$PSQL -d "$DB" -f scripts/migrate_add_school_type.sql
$PSQL -d "$DB" -f scripts/migrate_add_student_class.sql
$PSQL -d "$DB" -f scripts/migrate_attendance_morning_evening.sql
# migrate_teacher_kutir.sql: its partial index uses a subquery, which Postgres
# rejects, so only its column drop is applied here.
$PSQL -d "$DB" -c "ALTER TABLE kutirs DROP COLUMN IF EXISTS teacher_id;"
venv/bin/python migrate_class_in_year.py
venv/bin/python migrate_status_field.py
venv/bin/python migrate_drop_grade.py

echo "→ Applying numbered migrations (NNN_*.sql)"
for f in scripts/0[0-9][0-9]_*.sql; do
  echo "  $f"
  $PSQL -d "$DB" -f "$f"
done

echo "→ Syncing schema_migrations ledger (record applied NNN_*.sql; no re-run)"
venv/bin/python -m app.sql_migrations --sync-ledger

echo "→ Creating any remaining tables from models (e.g. app_settings)"
venv/bin/python -c "
import asyncio, pkgutil, importlib, app.models as m
for x in pkgutil.iter_modules(m.__path__): importlib.import_module(f'app.models.{x.name}')
from app.database import Base, engine
async def go():
    async with engine.begin() as c: await c.run_sync(Base.metadata.create_all)
asyncio.run(go())
" >/dev/null 2>&1

echo "✓ Done. Log in with admin (password from ADMIN_PASSWORD in backend/.env)."
