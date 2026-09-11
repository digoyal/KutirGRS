"""
Seed students and admission data for 2024, 2025, 2026.
Run from backend dir: venv/bin/python scripts/seed_students.py
"""
import asyncio, sys, os, random
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:namo1996@localhost:5432/kutirgrs_v2"
engine  = create_async_engine(DB_URL, echo=False)
Sess    = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

random.seed(42)

# ── Name pools ───────────────────────────────────────────────────────────────
BOYS   = ["Rahul","Arjun","Suresh","Deepak","Mukesh","Ramesh","Vikram",
          "Santosh","Anil","Ravi","Ajay","Pramod","Dinesh","Mohan","Vinod"]
GIRLS  = ["Priya","Sunita","Geeta","Kavita","Rekha","Meena","Anita",
          "Pooja","Nita","Usha","Suman","Lata","Rita","Seema","Mamta"]
LASTS  = ["Sharma","Verma","Patel","Singh","Yadav","Tiwari","Gupta",
          "Vishwakarma","Chouhan","Meena","Baiga","Gond","Sahu","Rajput"]
FATHERS = ["Ramchandra","Sitaram","Bhagwan","Harish","Suresh","Mahesh",
           "Rajesh","Ganesh","Devendra","Narendra","Shivlal","Babulal",
           "Tulsiram","Kailash","Jagdish"]
MOTHERS = ["Savitri","Kamla","Shakuntala","Laxmi","Parvati","Sarita",
           "Sunita","Meera","Radha","Durga","Rekha","Kiran","Asha","Usha"]

def rand_name(gender):
    pool = BOYS if gender == "Boy" else GIRLS
    return random.choice(pool), random.choice(LASTS)

def rand_dob(year_of_class5):
    """Child in class 5 ~10-11 yrs old; dob ~10-11 years before exam year."""
    birth_year = year_of_class5 - 11
    return date(birth_year, random.randint(1,12), random.randint(1,28))

async def seed():
    async with Sess() as s:
        # ── Fetch existing reference data ─────────────────────────────────────
        kutir_ids   = [r[0] for r in (await s.execute(text("SELECT id FROM kutirs ORDER BY id"))).fetchall()]
        school_ids  = [r[0] for r in (await s.execute(text("SELECT id FROM schools ORDER BY id"))).fetchall()]
        cat_ids     = [r[0] for r in (await s.execute(text("SELECT id FROM categories ORDER BY id"))).fetchall()]
        subcat_ids  = [r[0] for r in (await s.execute(text("SELECT id FROM sub_categories ORDER BY id"))).fetchall()]
        center_ids  = [r[0] for r in (await s.execute(text("SELECT id FROM exam_centers ORDER BY id"))).fetchall()]
        examcat_ids = [r[0] for r in (await s.execute(text("SELECT id FROM exam_categories ORDER BY id"))).fetchall()]
        noexam_ids  = [r[0] for r in (await s.execute(text("SELECT id FROM no_exam_reasons ORDER BY id"))).fetchall()]
        noadmit_ids = [r[0] for r in (await s.execute(text("SELECT id FROM no_admit_reasons ORDER BY id"))).fetchall()]

        if not kutir_ids:
            print("No kutirs found — run seed_kutirs.py first."); return
        if not school_ids:
            print("No schools found — add schools first."); return

        print(f"Found: {len(kutir_ids)} kutirs, {len(school_ids)} schools, "
              f"{len(cat_ids)} categories, {len(center_ids)} exam centers, "
              f"{len(examcat_ids)} exam categories")

        # ── Check existing students ───────────────────────────────────────────
        existing = (await s.execute(text("SELECT COUNT(*) FROM students"))).scalar()
        if existing > 0:
            print(f"\n{existing} students already exist.")
            resp = input("Add more? (y/N): ").strip().lower()
            if resp != "y":
                print("Skipped."); return

        # ── Create 25 students ────────────────────────────────────────────────
        GENDERS = ["Boy", "Boy", "Boy", "Girl", "Girl"]  # 60/40 split
        student_ids = []

        for i in range(25):
            gender = GENDERS[i % len(GENDERS)]
            first, last = rand_name(gender)
            father = random.choice(FATHERS) + " " + last
            mother = random.choice(MOTHERS) + " " + last
            cat_id    = random.choice(cat_ids)    if cat_ids    else None
            subcat_id = random.choice(subcat_ids) if subcat_ids else None
            kutir_id  = random.choice(kutir_ids)
            dob       = rand_dob(2024)

            result = await s.execute(text("""
                INSERT INTO students
                  (kutir_id, first_name, last_name, gender, dob,
                   father_name, mother_name, phone,
                   category_id, sub_category_id,
                   aadhaar, category_cert, birth_cert, residence_proof, medical,
                   created_at, updated_at)
                VALUES
                  (:kutir_id, :first_name, :last_name, :gender, :dob,
                   :father_name, :mother_name, :phone,
                   :cat_id, :subcat_id,
                   :aadhaar, :cat_cert, :birth_cert, :res_proof, :medical,
                   NOW(), NOW())
                RETURNING id
            """), {
                "kutir_id":   kutir_id,
                "first_name": first,
                "last_name":  last,
                "gender":     gender,
                "dob":        dob,
                "father_name": father,
                "mother_name": mother,
                "phone":      f"9{random.randint(100000000,999999999)}",
                "cat_id":     cat_id,
                "subcat_id":  subcat_id,
                "aadhaar":    random.random() > 0.1,
                "cat_cert":   random.random() > 0.2,
                "birth_cert": random.random() > 0.15,
                "res_proof":  random.random() > 0.25,
                "medical":    random.random() > 0.3,
            })
            sid = result.scalar_one()
            student_ids.append(sid)

        print(f"Inserted {len(student_ids)} students.")

        # ── Admission helper ──────────────────────────────────────────────────
        app_num_counter = [1000]

        def make_app_num(year):
            app_num_counter[0] += 1
            return f"GRS/{year}/{app_num_counter[0]:04d}"

        def make_roll(year, center_id):
            return f"{year}{center_id:02d}{random.randint(100,999)}"

        async def insert_exam(sid, school_id, year, stage, scores=None,
                               admitted_school_id=None, no_admit_id=None,
                               no_exam_id=None):
            """stage: eligible|form|applied|appeared|selected|admitted"""
            exam_cat_id = random.choice(examcat_ids) if examcat_ids else None
            center_id   = random.choice(center_ids)  if center_ids  else None

            form_received = stage in ("form","applied","appeared","selected","admitted")
            applied       = stage in ("applied","appeared","selected","admitted")
            appeared      = stage in ("appeared","selected","admitted")
            selected      = stage in ("selected","admitted")
            admitted      = stage == "admitted"

            roll = make_roll(year, center_id) if appeared and center_id else None
            app_num = make_app_num(year) if applied else None

            math = eng = reas = evs = None
            if scores:
                math, eng, reas, evs = scores

            await s.execute(text("""
                INSERT INTO student_exams
                  (student_id, school_id, school_start_year,
                   eligible, form_received, applied, appeared, selected, admitted,
                   exam_category_id, application_number, exam_center_id, roll_number,
                   math, english, reasoning, evs,
                   admitted_school_id, no_admit_reason_id, no_exam_reason_id,
                   created_at, updated_at)
                VALUES
                  (:sid, :school_id, :year,
                   TRUE, :form_received, :applied, :appeared, :selected, :admitted,
                   :exam_cat, :app_num, :center_id, :roll,
                   :math, :eng, :reas, :evs,
                   :admitted_school, :no_admit, :no_exam,
                   NOW(), NOW())
                ON CONFLICT ON CONSTRAINT uq_student_school_year DO NOTHING
            """), {
                "sid": sid, "school_id": school_id, "year": year,
                "form_received": form_received, "applied": applied,
                "appeared": appeared, "selected": selected, "admitted": admitted,
                "exam_cat": exam_cat_id, "app_num": app_num,
                "center_id": center_id if applied else None, "roll": roll,
                "math": math, "eng": eng, "reas": reas, "evs": evs,
                "admitted_school": admitted_school_id,
                "no_admit": no_admit_id, "no_exam": no_exam_id,
            })

        # ── 2024 admissions — all complete, various outcomes ──────────────────
        outcomes_2024 = [
            "admitted","admitted","admitted","admitted","admitted",   # 5 admitted
            "selected","selected",                                     # 2 selected, not admitted
            "appeared","appeared","appeared",                          # 3 appeared, not selected
            "applied","applied",                                       # 2 applied, didn't appear
            "form","eligible","eligible",                              # earlier drop-offs
        ]
        random.shuffle(outcomes_2024)

        school_id = random.choice(school_ids)
        print("\n2024 admissions:")
        for i, (sid, stage0) in enumerate(zip(student_ids, outcomes_2024)):
            stage = stage0
            scores = None
            admitted_school = None
            no_admit_id     = None
            no_exam_id      = None

            if stage in ("appeared","selected","admitted"):
                m = round(random.uniform(12, 30), 2)
                e = round(random.uniform(10, 30), 2)
                r = round(random.uniform(8, 25), 2)
                v = round(random.uniform(8, 20), 2)
                scores = (m, e, r, v)

            if stage == "admitted":
                admitted_school = random.choice(school_ids)
            elif stage == "selected" and noadmit_ids:
                no_admit_id = random.choice(noadmit_ids)
            elif stage == "appeared" and noexam_ids:
                pass  # appeared but not selected — no special reason needed

            if stage == "applied" and noexam_ids:
                no_exam_id = random.choice(noexam_ids)

            await insert_exam(sid, school_id, 2024, stage, scores,
                               admitted_school, no_admit_id, no_exam_id)
            print(f"  Student {sid}: {stage}")

        # ── 2025 admissions — mostly done ────────────────────────────────────
        outcomes_2025 = [
            "admitted","admitted","admitted",
            "selected","selected",
            "appeared","appeared","appeared",
            "applied","applied",
            "form","eligible","eligible",
        ]
        random.shuffle(outcomes_2025)

        school_id2 = random.choice(school_ids)
        print("\n2025 admissions:")
        for i, (sid, stage) in enumerate(zip(student_ids, outcomes_2025)):
            scores = None
            admitted_school = None
            no_admit_id = None
            no_exam_id  = None

            if stage in ("appeared","selected","admitted"):
                m = round(random.uniform(14, 30), 2)
                e = round(random.uniform(12, 30), 2)
                r = round(random.uniform(10, 25), 2)
                v = round(random.uniform(8, 20), 2)
                scores = (m, e, r, v)
            if stage == "admitted":
                admitted_school = random.choice(school_ids)
            elif stage == "selected" and noadmit_ids:
                no_admit_id = random.choice(noadmit_ids)

            await insert_exam(sid, school_id2, 2025, stage, scores,
                               admitted_school, no_admit_id, no_exam_id)
            print(f"  Student {sid}: {stage}")

        # ── 2026 admissions — in progress ─────────────────────────────────────
        outcomes_2026 = [
            "appeared","appeared","appeared","appeared",   # exams done, results pending
            "applied","applied","applied","applied",       # applied, exam upcoming
            "form","form",                                  # just forms filled
            "eligible","eligible","eligible","eligible",   # identified, not yet applied
        ]
        random.shuffle(outcomes_2026)

        school_id3 = random.choice(school_ids)
        print("\n2026 admissions:")
        for i, (sid, stage) in enumerate(zip(student_ids, outcomes_2026)):
            scores = None

            if stage == "appeared":
                m = round(random.uniform(15, 30), 2)
                e = round(random.uniform(12, 30), 2)
                r = round(random.uniform(10, 25), 2)
                v = round(random.uniform(8, 20), 2)
                scores = (m, e, r, v)

            await insert_exam(sid, school_id3, 2026, stage, scores)
            print(f"  Student {sid}: {stage}")

        await s.commit()
        print("\n✅ Seed complete!")
        total_exams = (await s.execute(text("SELECT COUNT(*) FROM student_exams"))).scalar()
        total_stud  = (await s.execute(text("SELECT COUNT(*) FROM students"))).scalar()
        print(f"   Students: {total_stud}  |  Admissions: {total_exams}")

asyncio.run(seed())
