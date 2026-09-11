"""
migrate_data.py — Copy all records from parivaar_grs (Django) → kutirgrs_v2 (FastAPI)

Run from the kutirGRS-v2/backend directory:
    python scripts/migrate_data.py

Prerequisites:
  - Geo tables (zones, districts, areas, clusters) already seeded via seed_geo.py
  - New DB tables created (run the app once to trigger alembic / create_all)

Users are NOT migrated — create them fresh in the new app.
Kutir.teacher_id and KutirVisit.visited_by_id will be NULL (old user IDs don't exist in new DB).
"""
import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

SRC_DSN = "postgresql://postgres:namo1996@localhost/parivaar_grs"
DST_DSN = "postgresql://postgres:namo1996@localhost/kutirgrs_v2"

NOW = datetime.now(timezone.utc)


async def migrate():
    print("Connecting to databases...")
    src = await asyncpg.connect(SRC_DSN)
    dst = await asyncpg.connect(DST_DSN)

    try:
        # ── 0. Clear destination tables in reverse FK order ──────────────────
        print("\n→ Clearing destination tables...")
        await dst.execute("""
            SET session_replication_role = replica;
            TRUNCATE TABLE
                kutir_visits,
                student_exam_scores,
                student_exams,
                student_progress,
                students,
                kutirs,
                schools,
                exam_centers,
                subjects,
                school_type_subject_subjects,
                school_type_subjects,
                categories,
                sub_categories,
                exam_categories,
                no_exam_reasons,
                no_admit_reasons,
                donors
            RESTART IDENTITY CASCADE;
            SET session_replication_role = DEFAULT;
        """)
        print("   Tables cleared.")

        # ── Helper ───────────────────────────────────────────────────────────
        async def enable_replica(conn):
            await conn.execute("SET session_replication_role = replica")

        async def disable_replica(conn):
            await conn.execute("SET session_replication_role = DEFAULT")

        async def reset_seq(conn, table, col="id", rows=None):
            if rows:
                max_id = max(r[col] for r in rows)
                await conn.execute(f"SELECT setval('{table}_{col}_seq', {max_id})")

        # ── 1. Lookups ───────────────────────────────────────────────────────
        for (src_table, dst_table, cols, placeholders, extract) in [
            ("grs_category", "categories",
             "id, name", "$1,$2",
             lambda r: (r["id"], r["name"])),
            ("grs_subcategory", "sub_categories",
             "id, name", "$1,$2",
             lambda r: (r["id"], r["name"])),
            ("grs_examcategory", "exam_categories",
             "id, name", "$1,$2",
             lambda r: (r["id"], r["name"])),
            ("grs_noexamreason", "no_exam_reasons",
             "id, text", "$1,$2",
             lambda r: (r["id"], r["text"])),
            ("grs_noadmitreason", "no_admit_reasons",
             "id, text", "$1,$2",
             lambda r: (r["id"], r["text"])),
            ("grs_donor", "donors",
             "id, name, contact, notes", "$1,$2,$3,$4",
             lambda r: (r["id"], r["name"], r["contact"] or "", r["notes"] or "")),
            ("grs_subject", "subjects",
             "id, name", "$1,$2",
             lambda r: (r["id"], r["name"])),
        ]:
            print(f"\n→ Migrating {dst_table}...")
            rows = await src.fetch(f"SELECT * FROM {src_table} ORDER BY id")
            if rows:
                await enable_replica(dst)
                await dst.executemany(
                    f"INSERT INTO {dst_table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                    [extract(r) for r in rows]
                )
                await disable_replica(dst)
                await reset_seq(dst, dst_table, "id", rows)
            print(f"   {len(rows)} rows")

        # School type subjects + M2M
        print("\n→ Migrating school_type_subjects...")
        rows = await src.fetch("SELECT id, school_type FROM grs_schooltypesubject ORDER BY id")
        m2m = []
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                "INSERT INTO school_type_subjects (id, school_type) VALUES ($1,$2) ON CONFLICT DO NOTHING",
                [(r["id"], r["school_type"]) for r in rows]
            )
            m2m = await src.fetch(
                "SELECT schooltypesubject_id, subject_id FROM grs_schooltypesubject_subjects"
            )
            if m2m:
                await dst.executemany(
                    "INSERT INTO school_type_subject_subjects (school_type_subject_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
                    [(r["schooltypesubject_id"], r["subject_id"]) for r in m2m]
                )
            await disable_replica(dst)
            await reset_seq(dst, "school_type_subjects", "id", rows)
        print(f"   {len(rows)} school_type_subjects + {len(m2m)} subject mappings")

        # ── 2. Schools & Exam Centers ────────────────────────────────────────
        # Note: new schools table has created_at/updated_at; old Django table does not
        print("\n→ Migrating schools...")
        rows = await src.fetch("""
            SELECT id, name, school_type, street, city, district_id, state, pincode
            FROM grs_govtresidentialschool ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO schools (id, name, school_type, street, city, district_id, state, pincode, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING""",
                [(r["id"], r["name"], r["school_type"],
                  r["street"] or None, r["city"] or None, r["district_id"],
                  r["state"] or "Madhya Pradesh", r["pincode"] or None,
                  NOW, NOW) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "schools", "id", rows)
        print(f"   {len(rows)} schools")

        print("\n→ Migrating exam_centers...")
        rows = await src.fetch("""
            SELECT id, name, street, city, district_id, state, pincode
            FROM grs_examcenter ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO exam_centers (id, name, street, city, district_id, state, pincode)
                   VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING""",
                [(r["id"], r["name"], r["street"] or None, r["city"] or None,
                  r["district_id"], r["state"] or "Madhya Pradesh", r["pincode"] or None) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "exam_centers", "id", rows)
        print(f"   {len(rows)} exam_centers")

        # ── 3. Kutirs ────────────────────────────────────────────────────────
        # teacher_id → NULL (users not migrated)
        print("\n→ Migrating kutirs...")
        rows = await src.fetch("""
            SELECT id, cluster_id, kutir_type, name, village, district_id, state,
                   pincode, street, donor_id, enrollment_5th, enrollment_8th,
                   created_at, updated_at
            FROM grs_kutir ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO kutirs (id, cluster_id, kutir_type, name, village, district_id,
                     state, pincode, street, teacher_id, donor_id,
                     enrollment_5th, enrollment_8th, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                   ON CONFLICT DO NOTHING""",
                [(r["id"], r["cluster_id"], r["kutir_type"], r["name"],
                  r["village"] or None, r["district_id"],
                  r["state"] or "Madhya Pradesh", r["pincode"] or None, r["street"] or None,
                  None,  # teacher_id: users not migrated
                  r["donor_id"], r["enrollment_5th"], r["enrollment_8th"],
                  r["created_at"], r["updated_at"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "kutirs", "id", rows)
        print(f"   {len(rows)} kutirs")

        # ── 4. Students ──────────────────────────────────────────────────────
        print("\n→ Migrating students...")
        rows = await src.fetch("""
            SELECT id, kutir_id, first_name, last_name, photo, gender, dob,
                   street, pincode, phone, email, father_name, mother_name,
                   category_id, sub_category_id, alt_contact_name, alt_contact_phone,
                   aadhaar, category_cert, birth_cert, residence_proof, medical,
                   created_at, updated_at
            FROM grs_student ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO students (id, kutir_id, first_name, last_name, photo, gender, dob,
                     street, pincode, phone, email, father_name, mother_name,
                     category_id, sub_category_id, alt_contact_name, alt_contact_phone,
                     aadhaar, category_cert, birth_cert, residence_proof, medical,
                     created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                           $18,$19,$20,$21,$22,$23,$24)
                   ON CONFLICT DO NOTHING""",
                [(r["id"], r["kutir_id"], r["first_name"], r["last_name"],
                  r["photo"] or None, r["gender"], r["dob"],
                  r["street"] or None, r["pincode"] or None, r["phone"] or None,
                  r["email"] or None, r["father_name"] or None, r["mother_name"] or None,
                  r["category_id"], r["sub_category_id"],
                  r["alt_contact_name"] or None, r["alt_contact_phone"] or None,
                  r["aadhaar"], r["category_cert"], r["birth_cert"],
                  r["residence_proof"], r["medical"],
                  r["created_at"], r["updated_at"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "students", "id", rows)
        print(f"   {len(rows)} students")

        # ── 5. StudentExams + scores ─────────────────────────────────────────
        print("\n→ Migrating student_exams...")
        rows = await src.fetch("""
            SELECT id, student_id, school_id, school_start_year,
                   eligible, form_received, applied, appeared, selected, admitted,
                   admitted_school_id, no_admit_reason_id, exam_category_id,
                   application_number, exam_center_id, roll_number, no_exam_reason_id,
                   math, english, reasoning, evs,
                   created_at, updated_at
            FROM grs_studentexam ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO student_exams (id, student_id, school_id, school_start_year,
                     eligible, form_received, applied, appeared, selected, admitted,
                     admitted_school_id, no_admit_reason_id, exam_category_id,
                     application_number, exam_center_id, roll_number, no_exam_reason_id,
                     math, english, reasoning, evs, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                           $18,$19,$20,$21,$22,$23)
                   ON CONFLICT DO NOTHING""",
                [(r["id"], r["student_id"], r["school_id"], r["school_start_year"],
                  r["eligible"], r["form_received"], r["applied"], r["appeared"],
                  r["selected"], r["admitted"],
                  r["admitted_school_id"], r["no_admit_reason_id"], r["exam_category_id"],
                  r["application_number"] or None, r["exam_center_id"],
                  r["roll_number"] or None, r["no_exam_reason_id"],
                  r["math"], r["english"], r["reasoning"], r["evs"],
                  r["created_at"], r["updated_at"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "student_exams", "id", rows)
        print(f"   {len(rows)} student_exams")

        print("\n→ Migrating student_exam_scores...")
        rows = await src.fetch(
            "SELECT id, exam_id, subject_id, score FROM grs_studentexamscore ORDER BY id"
        )
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                "INSERT INTO student_exam_scores (id, exam_id, subject_id, score) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
                [(r["id"], r["exam_id"], r["subject_id"], r["score"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "student_exam_scores", "id", rows)
        print(f"   {len(rows)} student_exam_scores")

        # ── 6. StudentProgress ───────────────────────────────────────────────
        print("\n→ Migrating student_progress...")
        rows = await src.fetch("""
            SELECT id, student_id, school_id, academic_year, grade,
                   is_enrolled, exit_reason, previous_year_percentage, remarks,
                   created_at, updated_at
            FROM grs_studentprogress ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO student_progress (id, student_id, school_id, academic_year, grade,
                     is_enrolled, exit_reason, previous_year_percentage, remarks,
                     created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                   ON CONFLICT DO NOTHING""",
                [(r["id"], r["student_id"], r["school_id"], r["academic_year"], r["grade"],
                  r["is_enrolled"], r["exit_reason"] or None,
                  r["previous_year_percentage"], r["remarks"] or None,
                  r["created_at"], r["updated_at"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "student_progress", "id", rows)
        print(f"   {len(rows)} student_progress")

        # ── 7. KutirVisits ───────────────────────────────────────────────────
        # visited_by_id → NULL (users not migrated; FK is SET NULL anyway)
        print("\n→ Migrating kutir_visits...")
        rows = await src.fetch("""
            SELECT id, kutir_id, visit_date,
                   avg_attendance_last_week, follow_timetable, follow_monthly_plan,
                   timetable_plan_reason, math_topics_pre, math_topics_upper,
                   english_topics_pre, english_topics_upper,
                   timeslot_utilization, timeslot_reason, grs_prep_remarks,
                   physical_vs_registered, workbook_percentage, workbook_completion,
                   book_availability,
                   cleanliness, hindi_proficiency, english_proficiency, maths_proficiency,
                   evs_proficiency, reasoning_proficiency, material_management, kutir_performance,
                   reg_admission_forms, reg_attendance_students, reg_daily_activity,
                   reg_observation, reg_students_data, reg_attendance_teachers,
                   reg_students_documents, regular_students,
                   timeslot_bal_sabha, timeslot_sports, timeslot_yoga,
                   timeslot_value_ed, timeslot_gk_map,
                   visit_photo, final_remarks,
                   created_at, updated_at
            FROM grs_kutirvisit ORDER BY id
        """)
        if rows:
            await enable_replica(dst)
            await dst.executemany(
                """INSERT INTO kutir_visits (
                     id, kutir_id, visited_by_id, visit_date,
                     avg_attendance_last_week, follow_timetable, follow_monthly_plan,
                     timetable_plan_reason, math_topics_pre, math_topics_upper,
                     english_topics_pre, english_topics_upper,
                     timeslot_utilization, timeslot_reason, grs_prep_remarks,
                     physical_vs_registered, workbook_percentage, workbook_completion,
                     book_availability,
                     cleanliness, hindi_proficiency, english_proficiency, maths_proficiency,
                     evs_proficiency, reasoning_proficiency, material_management, kutir_performance,
                     reg_admission_forms, reg_attendance_students, reg_daily_activity,
                     reg_observation, reg_students_data, reg_attendance_teachers,
                     reg_students_documents, regular_students,
                     timeslot_bal_sabha, timeslot_sports, timeslot_yoga,
                     timeslot_value_ed, timeslot_gk_map,
                     visit_photo, final_remarks,
                     created_at, updated_at
                   ) VALUES (
                     $1,$2,NULL,$3,
                     $4,$5,$6,$7,$8,$9,$10,$11,
                     $12,$13,$14,$15,$16,$17,$18,
                     $19,$20,$21,$22,$23,$24,$25,$26,
                     $27,$28,$29,$30,$31,$32,$33,$34,
                     $35,$36,$37,$38,$39,
                     $40,$41,$42,$43
                   ) ON CONFLICT DO NOTHING""",
                [(r["id"], r["kutir_id"], r["visit_date"],
                  r["avg_attendance_last_week"], r["follow_timetable"], r["follow_monthly_plan"],
                  r["timetable_plan_reason"] or None, r["math_topics_pre"] or None,
                  r["math_topics_upper"] or None, r["english_topics_pre"] or None,
                  r["english_topics_upper"] or None,
                  r["timeslot_utilization"], r["timeslot_reason"] or None,
                  r["grs_prep_remarks"] or None,
                  r["physical_vs_registered"], r["workbook_percentage"],
                  r["workbook_completion"], r["book_availability"],
                  r["cleanliness"], r["hindi_proficiency"], r["english_proficiency"],
                  r["maths_proficiency"], r["evs_proficiency"], r["reasoning_proficiency"],
                  r["material_management"], r["kutir_performance"],
                  r["reg_admission_forms"], r["reg_attendance_students"],
                  r["reg_daily_activity"], r["reg_observation"], r["reg_students_data"],
                  r["reg_attendance_teachers"], r["reg_students_documents"],
                  r["regular_students"],
                  r["timeslot_bal_sabha"], r["timeslot_sports"], r["timeslot_yoga"],
                  r["timeslot_value_ed"], r["timeslot_gk_map"],
                  r["visit_photo"] or None, r["final_remarks"] or None,
                  r["created_at"], r["updated_at"]) for r in rows]
            )
            await disable_replica(dst)
            await reset_seq(dst, "kutir_visits", "id", rows)
        print(f"   {len(rows)} kutir_visits")

        # ── Summary ──────────────────────────────────────────────────────────
        print("\n" + "="*55)
        print("✓ Migration complete!")
        print("="*55)
        print()
        print("Notes:")
        print("  • Geo data (zones/districts/areas/clusters) was pre-seeded.")
        print("  • Users NOT migrated — create them fresh in the new app.")
        print("  • kutir.teacher_id set to NULL (reassign after user creation).")
        print("  • kutir_visit.visited_by_id set to NULL (same reason).")

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        raise
    finally:
        await src.close()
        await dst.close()


if __name__ == "__main__":
    asyncio.run(migrate())
