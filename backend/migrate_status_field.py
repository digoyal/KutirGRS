"""
Migration: replace is_enrolled bool + exit_reason with status enum.
  status: enrolled | transferred | dropped_out | graduated
  transfer_school: VARCHAR(200) nullable (school name when transferred)
  exit_reason: VARCHAR(300) nullable (reason when dropped out) — column kept, size increased

Run from Mac terminal:
  cd ~/Projects/KutirGRS/backend && venv/bin/python migrate_status_field.py
"""
import asyncio, asyncpg

DB_URL = "postgresql://postgres:namo1996@localhost:5432/kutirgrs_v2"

SQL = """
-- 1. Add new columns
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  ADD COLUMN IF NOT EXISTS transfer_school VARCHAR(200);

-- 2. Increase exit_reason size (dropout reason can be longer)
ALTER TABLE student_progress
  ALTER COLUMN exit_reason TYPE VARCHAR(300);

-- 3. Migrate existing boolean to status
UPDATE student_progress SET status = 'enrolled'    WHERE is_enrolled = true;
UPDATE student_progress SET status = 'dropped_out' WHERE is_enrolled = false;

-- 4. Drop old boolean column
ALTER TABLE student_progress DROP COLUMN IF EXISTS is_enrolled;
"""

async def main():
    conn = await asyncpg.connect(DB_URL)
    try:
        # Run each statement individually
        for stmt in [s.strip() for s in SQL.split(';') if s.strip()]:
            print(f"Running: {stmt[:60]}...")
            await conn.execute(stmt)
        print("✓ Migration complete")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
