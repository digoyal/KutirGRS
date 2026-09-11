"""
Seed GRS Schools and Exam Centers with realistic MP data.
Run from backend dir: venv/bin/python scripts/seed_schools_centers.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:namo1996@localhost:5432/kutirgrs_v2"
engine  = create_async_engine(DB_URL, echo=False)
Sess    = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── GRS Schools ───────────────────────────────────────────────────────────────
# Real-pattern names for MP's residential school network
# Types: EMRS, JNV, KSP, MRS, GNV, KGBV, SportsBoys, SportsGirls, Other
SCHOOLS = [
    # Shivpuri (72)
    {"name": "Jawahar Navodaya Vidyalaya Shivpuri",              "school_type": "JNV",   "city": "Shivpuri",   "district_id": 72,  "state": "Madhya Pradesh", "pincode": "473551"},
    {"name": "Eklavya Model Residential School Karahal",         "school_type": "EMRS",  "city": "Karahal",    "district_id": 72,  "state": "Madhya Pradesh", "pincode": "476337"},
    {"name": "Kasturba Gandhi Balika Vidyalaya Shivpuri",        "school_type": "KGBV",  "city": "Shivpuri",   "district_id": 72,  "state": "Madhya Pradesh", "pincode": "473551"},
    # Sheopur (71)
    {"name": "Jawahar Navodaya Vidyalaya Sheopur",               "school_type": "JNV",   "city": "Sheopur",    "district_id": 71,  "state": "Madhya Pradesh", "pincode": "476337"},
    {"name": "Eklavya Model Residential School Sheopur",         "school_type": "EMRS",  "city": "Sheopur",    "district_id": 71,  "state": "Madhya Pradesh", "pincode": "476337"},
    {"name": "Kasturba Gandhi Balika Vidyalaya Sheopur",         "school_type": "KGBV",  "city": "Sheopur",    "district_id": 71,  "state": "Madhya Pradesh", "pincode": "476337"},
    # Alirajpur (64)
    {"name": "Eklavya Model Residential School Alirajpur",       "school_type": "EMRS",  "city": "Alirajpur",  "district_id": 64,  "state": "Madhya Pradesh", "pincode": "457887"},
    {"name": "Jawahar Navodaya Vidyalaya Alirajpur",             "school_type": "JNV",   "city": "Alirajpur",  "district_id": 64,  "state": "Madhya Pradesh", "pincode": "457887"},
    {"name": "Kasturba Gandhi Balika Vidyalaya Alirajpur",       "school_type": "KGBV",  "city": "Alirajpur",  "district_id": 64,  "state": "Madhya Pradesh", "pincode": "457887"},
    # Jhabua (76)
    {"name": "Eklavya Model Residential School Jhabua",          "school_type": "EMRS",  "city": "Jhabua",     "district_id": 76,  "state": "Madhya Pradesh", "pincode": "457661"},
    {"name": "Jawahar Navodaya Vidyalaya Jhabua",                "school_type": "JNV",   "city": "Jhabua",     "district_id": 76,  "state": "Madhya Pradesh", "pincode": "457661"},
    {"name": "Model Residential School Petlawad",                "school_type": "MRS",   "city": "Petlawad",   "district_id": 76,  "state": "Madhya Pradesh", "pincode": "457777"},
    # Dewas (78)
    {"name": "Jawahar Navodaya Vidyalaya Dewas",                 "school_type": "JNV",   "city": "Dewas",      "district_id": 78,  "state": "Madhya Pradesh", "pincode": "455001"},
    {"name": "Eklavya Model Residential School Kannod",          "school_type": "EMRS",  "city": "Kannod",     "district_id": 78,  "state": "Madhya Pradesh", "pincode": "455332"},
    {"name": "Govt. Navodaya Vidyalaya Dewas",                   "school_type": "GNV",   "city": "Dewas",      "district_id": 78,  "state": "Madhya Pradesh", "pincode": "455001"},
    # Seoni (63)
    {"name": "Jawahar Navodaya Vidyalaya Seoni",                 "school_type": "JNV",   "city": "Seoni",      "district_id": 63,  "state": "Madhya Pradesh", "pincode": "480661"},
    {"name": "Eklavya Model Residential School Seoni",           "school_type": "EMRS",  "city": "Seoni",      "district_id": 63,  "state": "Madhya Pradesh", "pincode": "480661"},
    {"name": "Kasturba Gandhi Balika Vidyalaya Seoni",           "school_type": "KGBV",  "city": "Seoni",      "district_id": 63,  "state": "Madhya Pradesh", "pincode": "480661"},
    # Balaghat (62)
    {"name": "Jawahar Navodaya Vidyalaya Balaghat",              "school_type": "JNV",   "city": "Balaghat",   "district_id": 62,  "state": "Madhya Pradesh", "pincode": "481001"},
    {"name": "Eklavya Model Residential School Waraseoni",       "school_type": "EMRS",  "city": "Waraseoni",  "district_id": 62,  "state": "Madhya Pradesh", "pincode": "481331"},
    # Chhindwara (69)
    {"name": "Jawahar Navodaya Vidyalaya Chhindwara",            "school_type": "JNV",   "city": "Chhindwara", "district_id": 69,  "state": "Madhya Pradesh", "pincode": "480001"},
    {"name": "Eklavya Model Residential School Tamia",           "school_type": "EMRS",  "city": "Tamia",      "district_id": 69,  "state": "Madhya Pradesh", "pincode": "480559"},
    {"name": "Kasturba Shaala Patalkot",                         "school_type": "KSP",   "city": "Patalkot",   "district_id": 69,  "state": "Madhya Pradesh", "pincode": "480559"},
    # Betul (68)
    {"name": "Jawahar Navodaya Vidyalaya Betul",                 "school_type": "JNV",   "city": "Betul",      "district_id": 68,  "state": "Madhya Pradesh", "pincode": "460001"},
    {"name": "Eklavya Model Residential School Bhimpur",         "school_type": "EMRS",  "city": "Bhimpur",    "district_id": 68,  "state": "Madhya Pradesh", "pincode": "460440"},
    # Dindori (80)
    {"name": "Eklavya Model Residential School Dindori",         "school_type": "EMRS",  "city": "Dindori",    "district_id": 80,  "state": "Madhya Pradesh", "pincode": "481880"},
    {"name": "Jawahar Navodaya Vidyalaya Dindori",               "school_type": "JNV",   "city": "Dindori",    "district_id": 80,  "state": "Madhya Pradesh", "pincode": "481880"},
    # Anuppur (67)
    {"name": "Eklavya Model Residential School Rajendragram",    "school_type": "EMRS",  "city": "Rajendragram","district_id": 67, "state": "Madhya Pradesh", "pincode": "484224"},
    {"name": "Jawahar Navodaya Vidyalaya Anuppur",               "school_type": "JNV",   "city": "Anuppur",    "district_id": 67,  "state": "Madhya Pradesh", "pincode": "484224"},
    # Barwani (77)
    {"name": "Eklavya Model Residential School Barwani",         "school_type": "EMRS",  "city": "Barwani",    "district_id": 77,  "state": "Madhya Pradesh", "pincode": "451551"},
    {"name": "Jawahar Navodaya Vidyalaya Barwani",               "school_type": "JNV",   "city": "Barwani",    "district_id": 77,  "state": "Madhya Pradesh", "pincode": "451551"},
    # Sidhi (82)
    {"name": "Jawahar Navodaya Vidyalaya Sidhi",                 "school_type": "JNV",   "city": "Sidhi",      "district_id": 82,  "state": "Madhya Pradesh", "pincode": "486661"},
    {"name": "Eklavya Model Residential School Sidhi",           "school_type": "EMRS",  "city": "Sidhi",      "district_id": 82,  "state": "Madhya Pradesh", "pincode": "486661"},
    # Shahdol (81)
    {"name": "Jawahar Navodaya Vidyalaya Shahdol",               "school_type": "JNV",   "city": "Shahdol",    "district_id": 81,  "state": "Madhya Pradesh", "pincode": "484001"},
    {"name": "Eklavya Model Residential School Shahdol",         "school_type": "EMRS",  "city": "Shahdol",    "district_id": 81,  "state": "Madhya Pradesh", "pincode": "484001"},
    # Khargone (79)
    {"name": "Eklavya Model Residential School Khargone",        "school_type": "EMRS",  "city": "Khargone",   "district_id": 79,  "state": "Madhya Pradesh", "pincode": "451001"},
    {"name": "Jawahar Navodaya Vidyalaya Khargone",              "school_type": "JNV",   "city": "Khargone",   "district_id": 79,  "state": "Madhya Pradesh", "pincode": "451001"},
    # Mandla (87)
    {"name": "Eklavya Model Residential School Mawai",           "school_type": "EMRS",  "city": "Mawai",      "district_id": 87,  "state": "Madhya Pradesh", "pincode": "481661"},
    {"name": "Jawahar Navodaya Vidyalaya Mandla",                "school_type": "JNV",   "city": "Mandla",     "district_id": 87,  "state": "Madhya Pradesh", "pincode": "481661"},
    # Dhar (84)
    {"name": "Eklavya Model Residential School Dhar",            "school_type": "EMRS",  "city": "Dhar",       "district_id": 84,  "state": "Madhya Pradesh", "pincode": "454001"},
    {"name": "Jawahar Navodaya Vidyalaya Dhar",                  "school_type": "JNV",   "city": "Dhar",       "district_id": 84,  "state": "Madhya Pradesh", "pincode": "454001"},
    # Sports schools
    {"name": "Govt. Sports Residential School Shivpuri (Boys)",  "school_type": "SportsBoys",  "city": "Shivpuri",  "district_id": 72, "state": "Madhya Pradesh", "pincode": "473551"},
    {"name": "Govt. Sports Residential School Shivpuri (Girls)", "school_type": "SportsGirls", "city": "Shivpuri",  "district_id": 72, "state": "Madhya Pradesh", "pincode": "473551"},
    # Khandwa (66)
    {"name": "Eklavya Model Residential School Khalwa",          "school_type": "EMRS",  "city": "Khalwa",     "district_id": 66,  "state": "Madhya Pradesh", "pincode": "450331"},
    {"name": "Jawahar Navodaya Vidyalaya Khandwa",               "school_type": "JNV",   "city": "Khandwa",    "district_id": 66,  "state": "Madhya Pradesh", "pincode": "450001"},
]

# ── Additional Exam Centers ────────────────────────────────────────────────────
EXTRA_CENTERS = [
    {"name": "Govt. HS School Chhindwara",    "district_id": 69, "city": "Chhindwara", "state": "Madhya Pradesh", "pincode": "480001"},
    {"name": "Govt. HS School Betul",         "district_id": 68, "city": "Betul",      "state": "Madhya Pradesh", "pincode": "460001"},
    {"name": "Govt. HS School Dindori",       "district_id": 80, "city": "Dindori",    "state": "Madhya Pradesh", "pincode": "481880"},
    {"name": "Govt. HS School Anuppur",       "district_id": 67, "city": "Anuppur",    "state": "Madhya Pradesh", "pincode": "484224"},
    {"name": "Govt. HS School Dewas",         "district_id": 78, "city": "Dewas",      "state": "Madhya Pradesh", "pincode": "455001"},
    {"name": "Kendriya Vidyalaya Chhindwara", "district_id": 69, "city": "Chhindwara", "state": "Madhya Pradesh", "pincode": "480001"},
    {"name": "Govt. HS School Barwani",       "district_id": 77, "city": "Barwani",    "state": "Madhya Pradesh", "pincode": "451551"},
    {"name": "Govt. HS School Dhar",          "district_id": 84, "city": "Dhar",       "state": "Madhya Pradesh", "pincode": "454001"},
    {"name": "Govt. HS School Khargone",      "district_id": 79, "city": "Khargone",   "state": "Madhya Pradesh", "pincode": "451001"},
    {"name": "Kendriya Vidyalaya Balaghat",   "district_id": 62, "city": "Balaghat",   "state": "Madhya Pradesh", "pincode": "481001"},
    {"name": "Govt. HS School Alirajpur",     "district_id": 64, "city": "Alirajpur",  "state": "Madhya Pradesh", "pincode": "457887"},
    {"name": "Govt. HS School Mandla",        "district_id": 87, "city": "Mandla",     "state": "Madhya Pradesh", "pincode": "481661"},
    {"name": "Govt. HS School Shahdol",       "district_id": 81, "city": "Shahdol",    "state": "Madhya Pradesh", "pincode": "484001"},
    {"name": "Govt. HS School Sidhi",         "district_id": 82, "city": "Sidhi",      "state": "Madhya Pradesh", "pincode": "486661"},
]

async def seed():
    async with Sess() as s:
        # ── Schools ───────────────────────────────────────────────────────────
        existing_names_r = await s.execute(text("SELECT name FROM schools"))
        existing_names = {r[0] for r in existing_names_r.fetchall()}

        added_schools = 0
        for sch in SCHOOLS:
            if sch["name"] in existing_names:
                continue
            await s.execute(text("""
                INSERT INTO schools (name, school_type, city, district_id, state, pincode, created_at, updated_at)
                VALUES (:name, :school_type, :city, :district_id, :state, :pincode, NOW(), NOW())
            """), sch)
            added_schools += 1

        total_schools = (await s.execute(text("SELECT COUNT(*) FROM schools"))).scalar()
        print(f"Schools: added {added_schools} new  |  total {total_schools + added_schools}")

        # ── Exam Centers ──────────────────────────────────────────────────────
        existing_centers_r = await s.execute(text("SELECT name FROM exam_centers"))
        existing_centers = {r[0] for r in existing_centers_r.fetchall()}

        added_centers = 0
        for ec in EXTRA_CENTERS:
            if ec["name"] in existing_centers:
                continue
            await s.execute(text("""
                INSERT INTO exam_centers (name, district_id, city, state, pincode, created_at, updated_at)
                VALUES (:name, :district_id, :city, :state, :pincode, NOW(), NOW())
            """), ec)
            added_centers += 1

        total_centers = (await s.execute(text("SELECT COUNT(*) FROM exam_centers"))).scalar()
        print(f"Exam centers: added {added_centers} new  |  total {total_centers + added_centers}")

        await s.commit()

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n✅ Done!")
        rows = await s.execute(text("""
            SELECT school_type, COUNT(*) FROM schools
            GROUP BY school_type ORDER BY COUNT(*) DESC
        """))
        print("\nSchools by type:")
        for row in rows:
            print(f"  {row[0]:15s} {row[1]}")

asyncio.run(seed())
