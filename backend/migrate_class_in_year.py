"""
Migration: add class_in_year to student_progress; drop student_class from students
Run from backend/ with: venv/bin/python migrate_class_in_year.py
"""
import asyncio
import asyncpg

DSN = "postgresql://postgres:namo1996@localhost:5432/kutirgrs_v2"

async def main():
    conn = await asyncpg.connect(DSN)
    try:
        async with conn.transaction():
            await conn.execute("""
                ALTER TABLE student_progress
                ADD COLUMN IF NOT EXISTS class_in_year SMALLINT;
            """)
            print("Added class_in_year to student_progress")

            await conn.execute("""
                ALTER TABLE students
                DROP COLUMN IF EXISTS student_class;
            """)
            print("Dropped student_class from students")

        print("Migration complete.")
    finally:
        await conn.close()

asyncio.run(main())
