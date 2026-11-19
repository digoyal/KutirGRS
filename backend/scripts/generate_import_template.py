#!/usr/bin/env python3
"""Build repo-root GRS_Import_Template.xlsx from importer column definitions.

Run from repo: cd backend && ./venv/bin/python scripts/generate_import_template.py

Headers must match backend/app/routers/import_data.py (SHEET_ORDER). Row 2 is always
skipped by the importer. Legacy upload-only columns (contact, form_received,
area_name on Kutirs, district_name on Clusters, etc.) are intentionally omitted.
"""
from __future__ import annotations

import sys
from pathlib import Path

import openpyxl
from openpyxl.workbook import Workbook

BACKEND = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND.parent
sys.path.insert(0, str(BACKEND))

from app.routers.import_data import SHEET_ORDER  # noqa: E402

OUTPUT = REPO_ROOT / "GRS_Import_Template.xlsx"

# (headers, sample row) per sheet — keep in sync with import_data.py r.get(...) usage.
SHEETS: dict[str, tuple[list[str], list]] = {
    "0_Users": (
        ["username", "temp_password", "first_name", "last_name", "email", "phone", "title", "is_active"],
        ["asha.mehta", "ChangeMe@123", "Asha", "Mehta", "asha@example.com", "9876543210", "Teacher", "yes"],
    ),
    "1_Zones": (
        ["name", "userid"],
        ["Zone A", "asha.mehta"],
    ),
    "2_Categories": (["name"], ["ST"]),
    "3_SubCategories": (
        ["name", "category_name"],
        ["ST-A", "ST"],
    ),
    "4_Donors": (
        ["name", "email", "phone", "notes"],
        ["Rotary Club", "sponsor@rotary.example", "9876543210", "Annual sponsor"],
    ),
    "5_SchoolTypes": (["name"], ["EMRS"]),
    "6_ExamCategories": (["name"], ["Navodaya Class V"]),
    "7_NoExamReasons": (["reason"], ["Medical issues"]),
    "8_NoAdmitReasons": (["reason"], ["Documents missing"]),
    "9_Subjects": (["name"], ["Mathematics"]),
    "10_Districts": (
        ["name", "zone_name", "state_name", "parivaar_presence", "userid"],
        ["Raipur", "Zone A", "Chhattisgarh", "yes", "asha.mehta"],
    ),
    "11_Areas": (
        ["name", "district_name", "userid"],
        ["North Area", "Raipur", "asha.mehta"],
    ),
    "12_Schools": (
        ["name", "school_type", "street", "city", "district_name", "state", "pincode"],
        ["EMRS Raipur", "EMRS", "Station Road", "Raipur", "Raipur", "Chhattisgarh", "492001"],
    ),
    "13_ExamCenters": (
        ["name", "street", "city", "district_name", "state", "pincode"],
        ["Govt School Center", "Near Collectorate", "Raipur", "Raipur", "Chhattisgarh", "492001"],
    ),
    "14_Clusters": (
        ["name", "area_name", "userid"],
        ["Cluster 1", "North Area", "asha.mehta"],
    ),
    "15_ExamTypes": (
        ["name", "school_types"],
        ["EMRS Class V", "EMRS, Navodaya"],
    ),
    "16_SubjectsByExamType": (
        ["exam_type_name", "subjects"],
        ["EMRS Class V", "Mathematics, Science"],
    ),
    "17_Kutirs": (
        [
            "name",
            "kutir_type",
            "cluster_name",
            "district_name",
            "street",
            "state",
            "pincode",
            "donor_name",
            "userid",
        ],
        [
            "Kutir No 1",
            "Seva Kutir",
            "Cluster 1",
            "Raipur",
            "123 Main St",
            "Chhattisgarh",
            "492001",
            "Rotary Club",
            "asha.mehta",
        ],
    ),
    "18_Students": (
        [
            "first_name",
            "last_name",
            "district_name",
            "cluster_name",
            "kutir_name",
            "gender",
            "dob",
            "category_name",
            "sub_category_name",
            "father_name",
            "mother_name",
            "phone",
            "email",
            "alt_contact_name",
            "alt_contact_phone",
            "aadhaar",
            "category_cert",
            "birth_cert",
            "residence_proof",
            "medical",
            "exam_year",
        ],
        [
            "Ravi",
            "Sharma",
            "Raipur",
            "Cluster 1",
            "Kutir No 1",
            "Boy",
            "2012-06-15",
            "ST",
            "ST-A",
            "Suresh Sharma",
            "Sunita Sharma",
            "9876543210",
            None,
            None,
            None,
            "yes",
            "yes",
            "yes",
            "no",
            "no",
            2025,
        ],
    ),
    "19_Admissions": (
        [
            "first_name",
            "last_name",
            "district_name",
            "cluster_name",
            "kutir_name",
            "school_name",
            "school_type",
            "school_start_year",
            "exam_category_name",
            "eligible",
            "applied",
            "admit_card",
            "appeared",
            "no_exam_reason",
            "selected",
            "admitted",
            "no_admit_reason",
            "application_number",
            "roll_number",
            "exam_center_name",
            "admitted_school_name",
            "admission_class",
            "score_mathematics",
            "score_english",
            "score_evs",
            "score_hindi",
            "score_reasoning",
            "exam_type_name",
            "result_declared",
        ],
        [
            "Ravi",
            "Sharma",
            "Raipur",
            "Cluster 1",
            "Kutir No 1",
            "Govt HS Raipur",
            "EMRS",
            2025,
            "Navodaya Class V",
            "yes",
            "yes",
            "yes",
            "yes",
            None,
            "yes",
            "yes",
            None,
            "APP/2025/001",
            "ROLL/2025/001",
            "Govt School Center",
            "EMRS Raipur",
            5,
            85.5,
            72,
            68.5,
            80,
            91,
            "JNV Class V",
            "yes",
        ],
    ),
    "20_Progress": (
        [
            "first_name",
            "last_name",
            "district_name",
            "cluster_name",
            "kutir_name",
            "school_name",
            "academic_year",
            "class_in_year",
            "status",
            "remarks",
            "track",
            "marks_6",
            "marks_7",
            "marks_8",
            "marks_9",
            "marks_10",
            "marks_11",
            "marks_12",
        ],
        [
            "Ravi",
            "Sharma",
            "Raipur",
            "Cluster 1",
            "Kutir No 1",
            "EMRS Raipur",
            2025,
            6,
            "enrolled",
            None,
            "six_twelve",
            78.5,
            None,
            None,
            None,
            None,
            None,
            None,
        ],
    ),
    "21_KutirVisits": (
        [
            "district_name",
            "cluster_name",
            "kutir_name",
            "visit_date",
            "visited_by",
            "avg_attendance_morning",
            "avg_attendance_evening",
            "follow_timetable",
            "kutir_closed",
            "plan_hindi",
            "plan_math",
            "plan_english",
            "timetable_plan_reason",
            "math_topics_pre",
            "math_topics_upper",
            "english_topics_pre",
            "english_topics_upper",
            "timeslot_reason",
            "grs_prep_remarks",
            "physical_vs_registered",
            "workbook_percentage",
            "workbook_completion",
            "book_availability",
            "cleanliness",
            "hindi_proficiency",
            "english_proficiency",
            "maths_proficiency",
            "evs_proficiency",
            "reasoning_proficiency",
            "material_management",
            "kutir_performance",
            "staff_behavior",
            "reg_admission_forms",
            "reg_attendance_students",
            "reg_daily_activity",
            "reg_observation",
            "reg_students_data",
            "reg_attendance_teachers",
            "reg_students_documents",
            "regular_students_morning",
            "regular_students_evening",
            "timeslot_bal_sabha",
            "timeslot_sports",
            "timeslot_yoga",
            "timeslot_value_ed",
            "timeslot_gk_map",
            "final_remarks",
        ],
        [
            "Raipur",
            "Cluster 1",
            "Kutir No 1",
            "2025-06-15",
            "asha.mehta",
            40,
            35,
            "yes",
            "no",
            "yes",
            "yes",
            "yes",
            None,
            "Addition, Subtraction",
            "Fractions, Algebra",
            "Vowels, Basic words",
            "Grammar, Comprehension",
            None,
            None,
            "Matched",
            75,
            "Upto Date",
            "Sufficient",
            4,
            3,
            3,
            4,
            3,
            3,
            4,
            4,
            None,
            "yes",
            "yes",
            "yes",
            "yes",
            "yes",
            "yes",
            "yes",
            38,
            33,
            "yes",
            "yes",
            "yes",
            "yes",
            "yes",
            None,
        ],
    ),
}

INSTRUCTIONS_ROWS = [
    ("GRS Import Template",),
    (),
    (
        "How to use: Keep sheet names exactly as given. On each data sheet: Row 1 = column "
        "headers, Row 2 = sample (always skipped by import), Row 3+ = your data. Headers are "
        "matched case-insensitively; spaces become underscores. Upload via Admin → Import Data. "
        "Sheets are processed in the numbered order below so foreign keys resolve.",
    ),
    (),
    ("Sheet order (FK-safe)",),
    ("Sheet", "Depends on"),
    ("0_Users", "—"),
    ("1_Zones", "0_Users (optional userid)"),
    ("2_Categories", "—"),
    ("3_SubCategories", "2_Categories"),
    ("4_Donors", "—"),
    ("5_SchoolTypes", "—"),
    ("6_ExamCategories", "—"),
    ("7_NoExamReasons", "—"),
    ("8_NoAdmitReasons", "—"),
    ("9_Subjects", "—"),
    ("10_Districts", "1_Zones; states table (state_name); optional userid"),
    ("11_Areas", "10_Districts"),
    ("12_Schools", "10_Districts (optional); 5_SchoolTypes (name text)"),
    ("13_ExamCenters", "10_Districts (optional)"),
    ("14_Clusters", "11_Areas (area_name only — no district_name column)"),
    ("15_ExamTypes", "5_SchoolTypes"),
    ("16_SubjectsByExamType", "15_ExamTypes; 9_Subjects"),
    ("17_Kutirs", "14_Clusters + district_name; 4_Donors; 0_Users"),
    ("18_Students", "17_Kutirs (district + cluster + kutir); 2/3 Categories"),
    ("19_Admissions", "18_Students; 12_Schools; lookups; 13_ExamCenters"),
    ("20_Progress", "18_Students; 12_Schools"),
    ("21_KutirVisits", "17_Kutirs; 0_Users"),
    (
        "Notes: school_start_year / academic_year / exam_year are integers (e.g. 2025), not "
        "display ranges like 2025-26. parivaar_presence on Districts defaults to yes. SysAdmin "
        "is a valid user title. This _Instructions sheet is ignored by the importer. Cluster "
        "names are unique within a district; kutir names within a cluster. If ambiguous, set "
        "district_name and cluster_name on Students / Admissions / Progress / KutirVisits "
        "(no area_name on those sheets). Regenerate this file: "
        "cd backend && ./venv/bin/python scripts/generate_import_template.py",
    ),
]


def _validate_sheet_defs() -> None:
    order = [name for name, _ in SHEET_ORDER]
    missing = [s for s in order if s not in SHEETS]
    extra = [s for s in SHEETS if s not in order]
    if missing or extra:
        raise SystemExit(
            f"SHEETS keys must match SHEET_ORDER.\n  missing: {missing}\n  extra: {extra}"
        )
    for name, (headers, sample) in SHEETS.items():
        if len(headers) != len(sample):
            raise SystemExit(f"{name}: header/sample length mismatch ({len(headers)} vs {len(sample)})")


def _write_instructions(wb: Workbook) -> None:
    ws = wb.create_sheet("_Instructions", 0)
    for row in INSTRUCTIONS_ROWS:
        ws.append(list(row) if row else [])


def build_workbook() -> Workbook:
    _validate_sheet_defs()
    wb = Workbook()
    default = wb.active
    wb.remove(default)
    _write_instructions(wb)
    for sheet_name, _handler in SHEET_ORDER:
        headers, sample = SHEETS[sheet_name]
        ws = wb.create_sheet(sheet_name)
        ws.append(headers)
        ws.append(sample)
    return wb


def main() -> None:
    wb = build_workbook()
    wb.save(OUTPUT)
    data_sheets = len(SHEET_ORDER)
    print(f"Wrote {OUTPUT} ({data_sheets} data sheets + _Instructions)")


if __name__ == "__main__":
    main()