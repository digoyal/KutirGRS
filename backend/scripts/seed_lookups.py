"""
Seed exam centers (and verify other lookups).
Run from backend dir: venv/bin/python scripts/seed_lookups.py
"""
import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:namo1996@localhost:5432/kutirgrs_v2"
engine = create_async_engine(DB_URL, echo=False)
Sess = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# district_id -> center name(s)
EXAM_CENTERS = [
    {"name": "Govt. HS School Shivpuri",     "district_id": 72, "city": "Shivpuri",  "state": "Madhya Pradesh", "pincode": "473551"},
    {"name": "Kendriya Vidyalaya Shivpuri",  "district_id": 72, "city": "Shivpuri",  "state": "Madhya Pradesh", "pincode": "473551"},
    {"name": "Govt. HS School Alirajpur",    "district_id": 64, "city": "Alirajpur", "state": "Madhya Pradesh", "pincode": "457887"},
    {"name": "Govt. Excellence School Dewas","district_id": 78, "city": "Dewas",     "state": "Madhya Pradesh", "pincode": "455001"},
    {"name": "Govt. HS School Kannod",       "district_id": 78, "city": "Kannod",    "state": "Madhya Pradesh", "pincode": "455332"},
    {"name": "Govt. HS School Jhabua",       "district_id": 76, "city": "Jhabua",    "state": "Madhya Pradesh", "pincode": "457661"},
    {"name": "Govt. HS School Petlawad",     "district_id": 76, "city": "Petlawad",  "state": "Madhya Pradesh", "pincode": "457777"},
    {"name": "Govt. HS School Sheopur",      "district_id": 71, "city": "Sheopur",   "state": "Madhya Pradesh", "pincode": "476337"},
    {"name": "Govt. HS School Seoni",        "district_id": 63, "city": "Seoni",     "state": "Madhya Pradesh", "pincode": "480661"},
    {"name": "Govt. HS School Balaghat",     "district_id": 62, "city": "Balaghat",  "state": "Madhya Pradesh", "pincode": "481001"},
    {"name": "Govt. HS School Waraseoni",    "district_id": 62, "city": "Waraseoni", "state": "Madhya Pradesh", "pincode": "481331"},
]

EXAM_CATEGORIES = [
    {"name": "Class 6 Navodaya", "code": "NVS6"},
    {"name": "Class 9 Navodaya", "code": "NVS9"},
    {"name": "Class 6 Kasturba", "code": "KGV6"},
    {"name": "Class 9 Kasturba", "code": "KGV9"},
    {"name": "Class 6 Sainik",   "code": "SAI6"},
]

NO_EXAM_REASONS = [
    {"reason": "Absent on exam day"},
    {"reason": "Admit card not received"},
    {"reason": "Family emergency"},
    {"reason": "Health issues"},
    {"reason": "Withdrew application"},
]

NO_ADMIT_REASONS = [
    {"reason": "Score below cutoff"},
    {"reason": "Document verification failed"},
    {"reason": "Medical fitness not cleared"},
    {"reason": "Seat not available"},
    {"reason": "Candidate declined admission"},
]

async def seed():
    async with Sess() as s:
        # Exam centers
        r = await s.execute(text("SELECT COUNT(*) FROM exam_centers"))
        if r.scalar() == 0:
            for c in EXAM_CENTERS:
                c.setdefault("city", None); c.setdefault("state", "Madhya Pradesh"); c.setdefault("pincode", None)
                await s.execute(
                    text("INSERT INTO exam_centers (name, district_id, city, state, pincode, created_at, updated_at) VALUES (:name, :district_id, :city, :state, :pincode, NOW(), NOW())"),
                    c
                )
            print(f"Inserted {len(EXAM_CENTERS)} exam centers.")
        else:
            print("Exam centers already seeded, skipping.")

        # Exam categories
        r = await s.execute(text("SELECT COUNT(*) FROM exam_categories"))
        existing = r.scalar()
        if existing < len(EXAM_CATEGORIES):
            r2 = await s.execute(text("SELECT name FROM exam_categories"))
            existing_names = {row[0] for row in r2.fetchall()}
            added = 0
            for c in EXAM_CATEGORIES:
                if c["name"] not in existing_names:
                    await s.execute(
                        text("INSERT INTO exam_categories (name, code, created_at, updated_at) VALUES (:name, :code, NOW(), NOW())"),
                        c
                    )
                    added += 1
            print(f"Added {added} exam categories.")
        else:
            print(f"Exam categories OK ({existing} rows).")

        # No exam reasons
        r = await s.execute(text("SELECT COUNT(*) FROM no_exam_reasons"))
        existing = r.scalar()
        if existing < len(NO_EXAM_REASONS):
            r2 = await s.execute(text("SELECT reason FROM no_exam_reasons"))
            existing_reasons = {row[0] for row in r2.fetchall()}
            added = 0
            for rec in NO_EXAM_REASONS:
                if rec["reason"] not in existing_reasons:
                    await s.execute(text("INSERT INTO no_exam_reasons (reason, created_at, updated_at) VALUES (:reason, NOW(), NOW())"), rec)
                    added += 1
            print(f"Added {added} no-exam reasons.")
        else:
            print(f"No-exam reasons OK ({existing} rows).")

        # No admit reasons
        r = await s.execute(text("SELECT COUNT(*) FROM no_admit_reasons"))
        existing = r.scalar()
        if existing < len(NO_ADMIT_REASONS):
            r2 = await s.execute(text("SELECT reason FROM no_admit_reasons"))
            existing_reasons = {row[0] for row in r2.fetchall()}
            added = 0
            for rec in NO_ADMIT_REASONS:
                if rec["reason"] not in existing_reasons:
                    await s.execute(text("INSERT INTO no_admit_reasons (reason, created_at, updated_at) VALUES (:reason, NOW(), NOW())"), rec)
                    added += 1
            print(f"Added {added} no-admit reasons.")
        else:
            print(f"No-admit reasons OK ({existing} rows).")

        await s.commit()
        print("Done!")

asyncio.run(seed())
