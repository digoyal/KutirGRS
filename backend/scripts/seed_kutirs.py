"""
Seed Kutirs and KutirVisits with realistic sample data.
Run from backend dir: venv/bin/python scripts/seed_kutirs.py
"""
import asyncio
import random
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

DB_URL = "postgresql+asyncpg://postgres:namo1996@localhost:5432/kutirgrs_v2"

import app.models.lookups, app.models.geo, app.models.users, app.models.donors
import app.models.schools, app.models.kutirs, app.models.students, app.models.visits

from app.models.kutirs import Kutir
from app.models.visits import KutirVisit

engine = create_async_engine(DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

CLUSTER_DISTRICT = {
    34: 72, 37: 64, 38: 78, 39: 76, 41: 71,
    42: 71, 43: 63, 44: 71, 46: 78, 51: 62, 52: 64, 53: 62,
}

KUTIRS_DATA = [
    {"name": "Gram Shiksha Kutir Devpura",  "kutir_type": "Shiksha Kutir", "cluster_id": 34, "village": "Devpura",   "street": "Near Gram Panchayat"},
    {"name": "Seva Kutir Pahadi",            "kutir_type": "Seva Kutir",    "cluster_id": 41, "village": "Pahadi",    "street": "Main Road"},
    {"name": "Shiksha Kutir Moravan",        "kutir_type": "Shiksha Kutir", "cluster_id": 42, "village": "Moravan",   "street": "Shivpuri Bypass"},
    {"name": "Gram Kutir Tongra",            "kutir_type": "Seva Kutir",    "cluster_id": 44, "village": "Tongra",    "street": "Near Temple"},
    {"name": "Shiksha Kendra Magardha",      "kutir_type": "Shiksha Kutir", "cluster_id": 43, "village": "Magardha",  "street": "Forest Road"},
    {"name": "Kutir Eklera",                 "kutir_type": "Seva Kutir",    "cluster_id": 38, "village": "Eklera",    "street": "Village Center"},
    {"name": "Kantaphod Shiksha Kutir",      "kutir_type": "Shiksha Kutir", "cluster_id": 46, "village": "Kantaphod", "street": "Near Anganwadi"},
    {"name": "Mahi Seva Kutir",              "kutir_type": "Seva Kutir",    "cluster_id": 39, "village": "Mahi",      "street": "Jhabua Road"},
    {"name": "Chilakda Learning Center",     "kutir_type": "Shiksha Kutir", "cluster_id": 37, "village": "Chilakda",  "street": "Panchayat Bhawan"},
    {"name": "Gata Non-Kutir Center",        "kutir_type": "Non-Kutir",     "cluster_id": 52, "village": "Gata",      "street": "Tribal Area"},
    {"name": "Murum Shiksha Kutir",          "kutir_type": "Shiksha Kutir", "cluster_id": 51, "village": "Murum",     "street": "Near School"},
    {"name": "Semarkhero Seva Kutir",        "kutir_type": "Seva Kutir",    "cluster_id": 53, "village": "Semarkhero","street": "Forest Colony"},
]

def rr():   return random.randint(2, 5)
def rb():   return random.choice([True, False])
def rbt():  return random.choices([True, False], weights=[3, 1])[0]

def make_visit(kutir_id, visit_date):
    ft = rbt(); fmp = rbt()
    return dict(
        kutir_id=kutir_id, visit_date=visit_date,
        avg_attendance_last_week=random.randint(10, 35),
        follow_timetable=ft, follow_monthly_plan=fmp,
        timetable_plan_reason=None if (ft and fmp) else random.choice([
            "Teacher absent", "Festival week", "Weather disruption", "Exam preparation"]),
        math_topics_pre=random.choice(["Addition, Subtraction", "Multiplication", "Fractions", "Basic Numbers"]),
        math_topics_upper=random.choice(["Algebra basics", "Geometry", "Percentages", "Decimals"]),
        english_topics_pre=random.choice(["Alphabets", "Simple words", "Short sentences", "Reading"]),
        english_topics_upper=random.choice(["Grammar", "Comprehension", "Essay writing", "Vocabulary"]),
        timeslot_utilization=rbt(),
        grs_prep_remarks=random.choice([
            "Good preparation", "Needs improvement in planning",
            "Adequate material ready", "Teacher well prepared", "Some gaps in preparation"]),
        physical_vs_registered=random.choice(["Matched", "Not Matched"]),
        workbook_percentage=random.randint(40, 100),
        workbook_completion=random.choice(["Upto Date", "Partial Upto Date", "Not Uptodate"]),
        book_availability=random.choice(["Sufficient", "Lacking", "More than required"]),
        cleanliness=rr(), hindi_proficiency=rr(), english_proficiency=rr(),
        maths_proficiency=rr(), evs_proficiency=rr(), reasoning_proficiency=rr(),
        material_management=rr(), kutir_performance=rr(),
        reg_admission_forms=rbt(), reg_attendance_students=rbt(),
        reg_daily_activity=rbt(), reg_observation=rbt(),
        reg_students_data=rbt(), reg_attendance_teachers=rbt(),
        reg_students_documents=rb(), regular_students=random.randint(8, 30),
        timeslot_bal_sabha=rbt(), timeslot_sports=rbt(),
        timeslot_yoga=rbt(), timeslot_value_ed=rbt(), timeslot_gk_map=rb(),
        final_remarks=random.choice([
            "Overall good progress. Keep it up.",
            "Students are engaged and motivated.",
            "Need to focus more on English reading.",
            "Attendance needs improvement.",
            "Excellent classroom environment.",
            "Teacher dedication is commendable.",
            "Academic performance is improving steadily.",]),
    )

def generate_visit_dates(start, end):
    dates = []
    current = start
    while current <= end:
        jitter = random.randint(-10, 10)
        visit = current + timedelta(days=jitter)
        if start <= visit <= end:
            dates.append(visit)
        current += timedelta(days=40 + random.randint(-5, 10))
    return dates


async def seed():
    random.seed(42)
    async with AsyncSessionLocal() as session:

        # --- Kutirs: insert only those that don't exist by name ---
        existing_names = set(
            r[0] for r in (await session.execute(select(Kutir.name))).all()
        )
        new_kutirs = []
        for kd in KUTIRS_DATA:
            if kd["name"] in existing_names:
                print(f"  skip (exists): {kd['name']}")
                continue
            k = Kutir(
                name=kd["name"], kutir_type=kd["kutir_type"],
                cluster_id=kd["cluster_id"],
                district_id=CLUSTER_DISTRICT.get(kd["cluster_id"]),
                state="Madhya Pradesh",
                village=kd.get("village"), street=kd.get("street"),
                enrollment_5th=random.randint(10, 30),
                enrollment_8th=random.randint(8, 25),
            )
            session.add(k)
            new_kutirs.append(kd["name"])
        if new_kutirs:
            await session.flush()
            print(f"Inserted {len(new_kutirs)} kutirs: {', '.join(new_kutirs)}")
        else:
            print("All seed kutirs already present.")

        # --- Fetch all seeded kutirs (by name) ---
        seed_names = [kd["name"] for kd in KUTIRS_DATA]
        result = await session.execute(select(Kutir).where(Kutir.name.in_(seed_names)))
        kutirs = result.scalars().all()

        # --- Visits: per-kutir, skip if already has visits ---
        start_date = date(2024, 1, 1)
        end_date   = date(2026, 9, 11)
        total = 0
        used = set()

        # Fetch existing (kutir_id, visit_date) pairs for our kutirs
        kutir_ids = [k.id for k in kutirs]
        if kutir_ids:
            existing_visits = await session.execute(
                select(KutirVisit.kutir_id, KutirVisit.visit_date)
                .where(KutirVisit.kutir_id.in_(kutir_ids))
            )
            for row in existing_visits.all():
                used.add((row[0], row[1]))

        for kutir in kutirs:
            for vdate in generate_visit_dates(start_date, end_date):
                key = (kutir.id, vdate)
                if key in used:
                    continue
                used.add(key)
                session.add(KutirVisit(**make_visit(kutir.id, vdate)))
                total += 1

        await session.commit()
        if total:
            print(f"Inserted {total} visits across {len(kutirs)} kutirs ({start_date} – {end_date}).")
        else:
            print("All visits already present.")
        print("Done!")


if __name__ == "__main__":
    asyncio.run(seed())
