"""One-shot migration: drop grade column from student_progress."""
import asyncio
import asyncpg

DB_URL = "postgresql://postgres:namo1996@localhost:5432/kutirgrs_v2"

async def main():
    conn = await asyncpg.connect(DB_URL)
    try:
        result = await conn.execute("ALTER TABLE student_progress DROP COLUMN IF EXISTS grade")
        print("✓ Migration done:", result)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
