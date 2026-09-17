"""Delete all student_progress records — run once to start fresh."""
import asyncio
import asyncpg

DSN = "postgresql://postgres:namo1996@localhost:5432/kutirgrs_v2"

async def main():
    conn = await asyncpg.connect(DSN)
    result = await conn.execute("DELETE FROM student_progress")
    await conn.close()
    print(f"Done: {result}")

asyncio.run(main())
