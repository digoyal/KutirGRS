"""
import_data.py — Excel workbook importer, Admin only.
POST /import/upload  → processes GRS_Import_Template.xlsx
GET  /import/template → downloads the template file
"""
from __future__ import annotations

import io
import os
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.database import get_db

router = APIRouter(prefix="/import", tags=["Import"])

# ── Pydantic response types ───────────────────────────────────────────────────

class SheetResult(BaseModel):
    sheet: str
    total: int
    created: int
    skipped: int
    errors: list[str]

class ImportResponse(BaseModel):
    results: list[SheetResult]
    totals: dict[str, int]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()

def _yn(val: Any) -> bool:
    return _str(val).lower() in ("yes", "true", "1", "y")

def _int(val: Any):
    s = _str(val)
    if not s:
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None

def _float(val: Any):
    if val is None or _str(val) == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def _date(val: Any):
    if val is None:
        return None
    if isinstance(val, (date, datetime)):
        return val.date() if isinstance(val, datetime) else val
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None

STATE_MAP = {
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh",
    "jharkhand": "Jharkhand",           "jh": "Jharkhand",
    "chhattisgarh": "Chhattisgarh",    "cg": "Chhattisgarh",
}
def _state(val: Any) -> str:
    return STATE_MAP.get(_str(val).lower(), "Madhya Pradesh")

VALID_TITLES = {"Teacher","Cluster Coordinator","Education Coordinator",
                "District Anchor","Regional Head","Admin"}
KUTIR_TYPE_MAP = {
    "seva kutir": "Seva Kutir", "seva": "Seva Kutir",
    "shiksha kutir": "Shiksha Kutir", "shiksha": "Shiksha Kutir",
    "non-kutir": "Non-Kutir", "non kutir": "Non-Kutir",
}

def _result(created, skipped, errors):
    cnt = Counter(errors)
    return {
        "created": created,
        "skipped": skipped,
        "errors": [f"{m} (×{c})" if c > 1 else m for m, c in cnt.items()],
    }

# ── Sheet parsers (all async, receive db session) ────────────────────────────

async def _import_users(rows, db):
    created = skipped = 0
    errors = []
    import bcrypt
    for r in rows:
        uname = _str(r.get("username"))
        if not uname:
            errors.append("Empty username — row skipped"); continue
        exists = (await db.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": uname}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        email = _str(r.get("email")) or None
        if email:
            email_exists = (await db.execute(
                text("SELECT id FROM users WHERE email = :e"), {"e": email}
            )).scalar_one_or_none()
            if email_exists:
                errors.append(f"Email '{email}' already exists — '{uname}' skipped")
                skipped += 1; continue
        title = _str(r.get("title"))
        if title and title not in VALID_TITLES:
            errors.append(f"Invalid title '{title}' for '{uname}' — imported without title")
            title = ""
        pw = _str(r.get("temp_password")) or "ChangeMe@123"
        hashed = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
        is_active = True
        raw_active = _str(r.get("is_active", "yes"))
        if raw_active:
            is_active = raw_active.lower() not in ("no", "false", "0")
        await db.execute(text("""
            INSERT INTO users (username, password, first_name, last_name,
                               email, phone, title, is_active, is_superuser,
                               created_at, updated_at)
            VALUES (:u, :pw, :fn, :ln, :em, :ph, :ti, :ia, false, now(), now())
        """), {
            "u": uname, "pw": hashed,
            "fn": _str(r.get("first_name")), "ln": _str(r.get("last_name")),
            "em": email, "ph": _str(r.get("phone")),
            "ti": title or None, "ia": is_active,
        })
        created += 1
    return _result(created, skipped, errors)


async def _import_zones(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        raw_name = _str(r.get("name"))
        if not raw_name:
            errors.append("Empty name — row skipped"); continue
        username = _str(r.get("userid"))
        uid = None
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": username}
            )).scalar_one_or_none()
            if not uid:
                errors.append(f"User '{username}' not found — zones will be created without user assignment")
        # Support comma-separated list of zone names on one row
        zone_names = [n.strip() for n in raw_name.split(",") if n.strip()]
        for name in zone_names:
            exists = (await db.execute(
                text("SELECT id FROM zones WHERE lower(name)=lower(:n)"), {"n": name}
            )).scalar_one_or_none()
            if exists:
                skipped += 1
                # Still assign user to an existing zone if not already assigned
                if uid:
                    await db.execute(
                        text("INSERT INTO user_zones (user_id, zone_id) VALUES (:u, :z) ON CONFLICT DO NOTHING"),
                        {"u": uid, "z": exists}
                    )
                continue
            zone_id = (await db.execute(
                text("INSERT INTO zones (name, created_at, updated_at) VALUES (:n, now(), now()) RETURNING id"), {"n": name}
            )).scalar_one_or_none()
            created += 1
            if uid:
                await db.execute(
                    text("INSERT INTO user_zones (user_id, zone_id) VALUES (:u, :z) ON CONFLICT DO NOTHING"),
                    {"u": uid, "z": zone_id}
                )
    return _result(created, skipped, errors)


async def _import_districts(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        raw_name = _str(r.get("name")); zone_name = _str(r.get("zone_name"))
        if not raw_name:
            errors.append("Empty name — row skipped"); continue
        zone_id = (await db.execute(
            text("SELECT id FROM zones WHERE lower(name)=lower(:n)"), {"n": zone_name}
        )).scalar_one_or_none()
        if not zone_id:
            errors.append(f"Zone '{zone_name}' not found for district '{raw_name}'"); continue
        username = _str(r.get("userid"))
        uid = None
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": username}
            )).scalar_one_or_none()
            if not uid:
                errors.append(f"User '{username}' not found — districts will be created without user assignment")
        for name in [n.strip() for n in raw_name.split(",") if n.strip()]:
            exists = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n) AND zone_id=:z"),
                {"n": name, "z": zone_id}
            )).scalar_one_or_none()
            if exists:
                skipped += 1
                if uid:
                    await db.execute(
                        text("INSERT INTO user_districts (user_id, district_id) VALUES (:u, :d) ON CONFLICT DO NOTHING"),
                        {"u": uid, "d": exists}
                    )
                continue
            dist_id = (await db.execute(
                text("INSERT INTO districts (name, zone_id, created_at, updated_at) VALUES (:n, :z, now(), now()) RETURNING id"),
                {"n": name, "z": zone_id}
            )).scalar_one_or_none()
            created += 1
            if uid:
                await db.execute(
                    text("INSERT INTO user_districts (user_id, district_id) VALUES (:u, :d) ON CONFLICT DO NOTHING"),
                    {"u": uid, "d": dist_id}
                )
    return _result(created, skipped, errors)


async def _import_areas(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        raw_name = _str(r.get("name")); dist_name = _str(r.get("district_name"))
        if not raw_name:
            errors.append("Empty name — row skipped"); continue
        dist_id = (await db.execute(
            text("SELECT id FROM districts WHERE lower(name)=lower(:n) LIMIT 1"), {"n": dist_name}
        )).scalar_one_or_none()
        if not dist_id:
            errors.append(f"District '{dist_name}' not found for area '{raw_name}'"); continue
        username = _str(r.get("userid"))
        uid = None
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": username}
            )).scalar_one_or_none()
            if not uid:
                errors.append(f"User '{username}' not found — areas will be created without user assignment")
        for name in [n.strip() for n in raw_name.split(",") if n.strip()]:
            exists = (await db.execute(
                text("SELECT id FROM areas WHERE lower(name)=lower(:n) AND district_id=:d"),
                {"n": name, "d": dist_id}
            )).scalar_one_or_none()
            if exists:
                skipped += 1
                if uid:
                    await db.execute(
                        text("INSERT INTO user_areas (user_id, area_id) VALUES (:u, :a) ON CONFLICT DO NOTHING"),
                        {"u": uid, "a": exists}
                    )
                continue
            area_id = (await db.execute(
                text("INSERT INTO areas (name, district_id, created_at, updated_at) VALUES (:n, :d, now(), now()) RETURNING id"),
                {"n": name, "d": dist_id}
            )).scalar_one_or_none()
            created += 1
            if uid:
                await db.execute(
                    text("INSERT INTO user_areas (user_id, area_id) VALUES (:u, :a) ON CONFLICT DO NOTHING"),
                    {"u": uid, "a": area_id}
                )
    return _result(created, skipped, errors)


async def _import_clusters(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        raw_name = _str(r.get("name")); area_name = _str(r.get("area_name"))
        if not raw_name:
            errors.append("Empty name — row skipped"); continue
        area_id = (await db.execute(
            text("SELECT id FROM areas WHERE lower(name)=lower(:n)"), {"n": area_name}
        )).scalar_one_or_none()
        if not area_id:
            errors.append(f"Area '{area_name}' not found for cluster '{raw_name}'"); continue
        username = _str(r.get("userid"))
        uid = None
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": username}
            )).scalar_one_or_none()
            if not uid:
                errors.append(f"User '{username}' not found — clusters will be created without user assignment")
        for name in [n.strip() for n in raw_name.split(",") if n.strip()]:
            exists = (await db.execute(
                text("SELECT id FROM clusters WHERE lower(name)=lower(:n) AND area_id=:a"),
                {"n": name, "a": area_id}
            )).scalar_one_or_none()
            if exists:
                skipped += 1
                if uid:
                    await db.execute(
                        text("INSERT INTO user_clusters (user_id, cluster_id) VALUES (:u, :c) ON CONFLICT DO NOTHING"),
                        {"u": uid, "c": exists}
                    )
                continue
            cluster_id = (await db.execute(
                text("INSERT INTO clusters (name, area_id, created_at, updated_at) VALUES (:n, :a, now(), now()) RETURNING id"),
                {"n": name, "a": area_id}
            )).scalar_one_or_none()
            created += 1
            if uid:
                await db.execute(
                    text("INSERT INTO user_clusters (user_id, cluster_id) VALUES (:u, :c) ON CONFLICT DO NOTHING"),
                    {"u": uid, "c": cluster_id}
                )
    return _result(created, skipped, errors)



async def _import_simple(rows, db, table, field):
    created = skipped = 0; errors = []
    if rows and field not in rows[0]:
        found = list(rows[0].keys())
        return _result(0, 0, [f"Column '{field}' not found in sheet — headers found: {found}"])
    for r in rows:
        val = _str(r.get(field))
        if not val:
            errors.append(f"Empty {field} — row skipped"); continue
        exists = (await db.execute(
            text(f"SELECT id FROM {table} WHERE lower({field})=lower(:v)"), {"v": val}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        await db.execute(text(f"INSERT INTO {table} ({field}, created_at, updated_at) VALUES (:v, now(), now())"), {"v": val})
        created += 1
    return _result(created, skipped, errors)


async def _import_subcategories(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        name = _str(r.get("name")); cat_name = _str(r.get("category_name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        cat_id = (await db.execute(
            text("SELECT id FROM categories WHERE lower(name)=lower(:n)"), {"n": cat_name}
        )).scalar_one_or_none()
        if not cat_id:
            errors.append(f"Category '{cat_name}' not found for sub-category '{name}'"); continue
        exists = (await db.execute(
            text("SELECT id FROM sub_categories WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        await db.execute(
            text("INSERT INTO sub_categories (name, category_id, created_at, updated_at) VALUES (:n, :c, now(), now())"),
            {"n": name, "c": cat_id}
        )
        created += 1
    return _result(created, skipped, errors)


async def _import_schools(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        name = _str(r.get("name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        stype = _str(r.get("school_type"))
        exists = (await db.execute(
            text("SELECT id FROM schools WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        dist_name = _str(r.get("district_name"))
        dist_id = None
        if dist_name:
            dist_id = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n) LIMIT 1"), {"n": dist_name}
            )).scalar_one_or_none()
        await db.execute(text("""
            INSERT INTO schools (name, school_type, street, city, district_id, state, pincode, created_at, updated_at)
            VALUES (:n, :st, :sr, :ci, :di, :sa, :pi, now(), now())
        """), {"n": name, "st": stype,
               "sr": _str(r.get("street")) or None,
               "ci": _str(r.get("city")) or None,
               "di": dist_id,
               "sa": _state(r.get("state")),
               "pi": _str(r.get("pincode")) or None})
        created += 1
    return _result(created, skipped, errors)


async def _import_exam_centers(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        name = _str(r.get("name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        exists = (await db.execute(
            text("SELECT id FROM exam_centers WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        dist_name = _str(r.get("district_name"))
        dist_id = None
        if dist_name:
            dist_id = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n) LIMIT 1"), {"n": dist_name}
            )).scalar_one_or_none()
        await db.execute(text("""
            INSERT INTO exam_centers (name, street, city, district_id, state, pincode, created_at, updated_at)
            VALUES (:n, :sr, :ci, :di, :sa, :pi, now(), now())
        """), {"n": name,
               "sr": _str(r.get("street")) or None,
               "ci": _str(r.get("city")) or None,
               "di": dist_id,
               "sa": _state(r.get("state")),
               "pi": _str(r.get("pincode")) or None})
        created += 1
    return _result(created, skipped, errors)


async def _import_donors(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        name = _str(r.get("name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        exists = (await db.execute(
            text("SELECT id FROM donors WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        await db.execute(
            text("INSERT INTO donors (name, contact, notes, created_at, updated_at) VALUES (:n, :c, :no, now(), now())"),
            {"n": name, "c": _str(r.get("contact")) or None, "no": _str(r.get("notes")) or None}
        )
        created += 1
    return _result(created, skipped, errors)


async def _import_kutirs(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        name = _str(r.get("name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        exists = (await db.execute(
            text("SELECT id FROM kutirs WHERE lower(name)=lower(:n) LIMIT 1"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        cluster_name = _str(r.get("cluster_name"))
        cluster_id = (await db.execute(
            text("SELECT id FROM clusters WHERE lower(name)=lower(:n) LIMIT 1"), {"n": cluster_name}
        )).scalar_one_or_none()
        if not cluster_id:
            errors.append(f"Cluster '{cluster_name}' not found for kutir '{name}'"); continue
        dist_name = _str(r.get("district_name"))
        dist_id = None
        if dist_name:
            dist_id = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n) LIMIT 1"), {"n": dist_name}
            )).scalar_one_or_none()
        ktype = KUTIR_TYPE_MAP.get(_str(r.get("kutir_type", "")).lower(), "Seva Kutir")
        donor_name = _str(r.get("donor_name"))
        donor_id = None
        if donor_name:
            donor_id = (await db.execute(
                text("SELECT id FROM donors WHERE lower(name)=lower(:n) LIMIT 1"), {"n": donor_name}
            )).scalar_one_or_none()
            if not donor_id:
                errors.append(f"Donor '{donor_name}' not found — kutir '{name}' imported without donor")
        await db.execute(text("""
            INSERT INTO kutirs (name, kutir_type, cluster_id, district_id, street,
                                state, pincode, donor_id, enrollment_5th, enrollment_8th,
                                created_at, updated_at)
            VALUES (:n, :kt, :cl, :di, :sr, :sa, :pi, :do, :e5, :e8, now(), now())
        """), {"n": name, "kt": ktype, "cl": cluster_id, "di": dist_id,
               "sr": _str(r.get("street")) or None,
               "sa": _state(r.get("state")),
               "pi": _str(r.get("pincode")) or None,
               "do": donor_id,
               "e5": _int(r.get("enrollment_5th")),
               "e8": _int(r.get("enrollment_8th"))})
        kutir_id = (await db.execute(text("SELECT id FROM kutirs WHERE lower(name)=lower(:n) LIMIT 1"), {"n": name})).scalar_one_or_none()
        created += 1
        username = _str(r.get("userid"))
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": username}
            )).scalar_one_or_none()
            if uid:
                await db.execute(
                    text("INSERT INTO user_kutirs (user_id, kutir_id) VALUES (:u, :k) ON CONFLICT DO NOTHING"),
                    {"u": uid, "k": kutir_id}
                )
            else:
                errors.append(f"User '{username}' not found — kutir '{name}' created without user")
    return _result(created, skipped, errors)


async def _import_students(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        first = _str(r.get("first_name")); last = _str(r.get("last_name"))
        if not first:
            errors.append("Empty first_name — row skipped"); continue
        kutir_name = _str(r.get("kutir_name"))
        kutir_id = (await db.execute(
            text("SELECT id FROM kutirs WHERE lower(name)=lower(:n)"), {"n": kutir_name}
        )).scalar_one_or_none()
        if not kutir_id:
            errors.append(f"Kutir '{kutir_name}' not found for student '{first} {last}'"); continue
        exists = (await db.execute(
            text("SELECT id FROM students WHERE lower(first_name)=lower(:f) "
                 "AND lower(last_name)=lower(:l) AND kutir_id=:k"),
            {"f": first, "l": last, "k": kutir_id}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        cat_name = _str(r.get("category_name"))
        cat_id = None
        if cat_name:
            cat_id = (await db.execute(
                text("SELECT id FROM categories WHERE lower(name)=lower(:n)"), {"n": cat_name}
            )).scalar_one_or_none()
        subcat_name = _str(r.get("sub_category_name"))
        subcat_id = None
        if subcat_name:
            subcat_id = (await db.execute(
                text("SELECT id FROM sub_categories WHERE lower(name)=lower(:n)"), {"n": subcat_name}
            )).scalar_one_or_none()
        gender = _str(r.get("gender", "Boy"))
        if gender not in ("Boy", "Girl"):
            gender = "Boy"
        dob_raw = r.get("dob")
        dob = _date(dob_raw)
        if dob_raw and not dob:
            errors.append(f"Bad date '{dob_raw}' for '{first} {last}' — imported without DOB")
        await db.execute(text("""
            INSERT INTO students (first_name, last_name, gender, dob, kutir_id,
                                  category_id, sub_category_id,
                                  father_name, mother_name, phone, email,
                                  street, pincode, alt_contact_name, alt_contact_phone,
                                  aadhaar, category_cert, birth_cert, residence_proof, medical,
                                  created_at, updated_at)
            VALUES (:fn, :ln, :ge, :db, :ki, :ca, :sc,
                    :fa, :mo, :ph, :em, :st, :pi, :an, :ap,
                    :aa, :cc, :bc, :rp, :me, now(), now())
        """), {"fn": first, "ln": last, "ge": gender, "db": dob, "ki": kutir_id,
               "ca": cat_id, "sc": subcat_id,
               "fa": _str(r.get("father_name")) or None,
               "mo": _str(r.get("mother_name")) or None,
               "ph": _str(r.get("phone")) or None,
               "em": _str(r.get("email")) or None,
               "st": _str(r.get("street")) or None,
               "pi": _str(r.get("pincode")) or None,
               "an": _str(r.get("alt_contact_name")) or None,
               "ap": _str(r.get("alt_contact_phone")) or None,
               "aa": _yn(r.get("aadhaar")),
               "cc": _yn(r.get("category_cert")),
               "bc": _yn(r.get("birth_cert")),
               "rp": _yn(r.get("residence_proof")),
               "me": _yn(r.get("medical"))})
        created += 1
    return _result(created, skipped, errors)


async def _import_exam_types(rows, db):
    """ExamType + its SchoolType members. Sheet columns: name, school_types (comma-separated names)."""
    created = skipped = 0; errors = []
    if rows and "name" not in rows[0]:
        return _result(0, 0, [f"Column 'name' not found — headers: {list(rows[0].keys())}"])
    for r in rows:
        name = _str(r.get("name"))
        if not name:
            errors.append("Empty name — row skipped"); continue
        exists = (await db.execute(
            text("SELECT id FROM exam_types WHERE lower(name)=lower(:n) LIMIT 1"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        et_id = (await db.execute(
            text("INSERT INTO exam_types (name, created_at, updated_at) VALUES (:n, now(), now()) RETURNING id"),
            {"n": name}
        )).scalar_one()
        school_types_raw = _str(r.get("school_types", ""))
        for st_name in [s.strip() for s in school_types_raw.split(",") if s.strip()]:
            st_id = (await db.execute(
                text("SELECT id FROM school_types WHERE lower(name)=lower(:n) LIMIT 1"), {"n": st_name}
            )).scalar_one_or_none()
            if st_id:
                await db.execute(
                    text("INSERT INTO exam_type_school_types (exam_type_id, school_type_id) VALUES (:e, :s) ON CONFLICT DO NOTHING"),
                    {"e": et_id, "s": st_id}
                )
            else:
                errors.append(f"SchoolType '{st_name}' not found for ExamType '{name}'")
        created += 1
    return _result(created, skipped, errors)



async def _import_exam_type_subjects(rows, db):
    """Map subjects to exam types. Columns: exam_type_name, subjects (comma-separated)."""
    created = skipped = 0; errors = []
    for r in rows:
        et_name = _str(r.get("exam_type_name"))
        if not et_name:
            errors.append("Empty exam_type_name — row skipped"); continue
        et_id = (await db.execute(
            text("SELECT id FROM exam_types WHERE lower(name)=lower(:n) LIMIT 1"), {"n": et_name}
        )).scalar_one_or_none()
        if not et_id:
            errors.append(f"ExamType '{et_name}' not found — row skipped"); continue
        subjects_raw = _str(r.get("subjects", ""))
        for subj_name in [s.strip() for s in subjects_raw.split(",") if s.strip()]:
            subj_id = (await db.execute(
                text("SELECT id FROM subjects WHERE lower(name)=lower(:n) LIMIT 1"), {"n": subj_name}
            )).scalar_one_or_none()
            if not subj_id:
                errors.append(f"Subject '{subj_name}' not found for ExamType '{et_name}'"); continue
            existing = (await db.execute(
                text("SELECT 1 FROM exam_type_subjects WHERE exam_type_id=:e AND subject_id=:s"),
                {"e": et_id, "s": subj_id}
            )).scalar_one_or_none()
            if existing:
                skipped += 1; continue
            await db.execute(
                text("INSERT INTO exam_type_subjects (exam_type_id, subject_id) VALUES (:e, :s) ON CONFLICT DO NOTHING"),
                {"e": et_id, "s": subj_id}
            )
            created += 1
    return _result(created, skipped, errors)


async def _import_admissions(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        # Resolve student
        student_id = _int(r.get("student_id"))
        if student_id:
            sid = (await db.execute(
                text("SELECT id FROM students WHERE id=:i"), {"i": student_id}
            )).scalar_one_or_none()
        else:
            first = _str(r.get("first_name")); last = _str(r.get("last_name"))
            kutir_name = _str(r.get("kutir_name"))
            kutir_id = (await db.execute(
                text("SELECT id FROM kutirs WHERE lower(name)=lower(:n)"), {"n": kutir_name}
            )).scalar_one_or_none() if kutir_name else None
            sid = (await db.execute(
                text("SELECT id FROM students WHERE lower(first_name)=lower(:f) "
                     "AND lower(last_name)=lower(:l) AND kutir_id=:k"),
                {"f": first, "l": last, "k": kutir_id}
            )).scalar_one_or_none() if (first and kutir_id) else None
        if not sid:
            ref = student_id or f"{r.get('first_name')} {r.get('last_name')}"
            errors.append(f"Student '{ref}' not found — row skipped"); continue

        # Required: school_name, school_type, school_start_year
        school_name = _str(r.get("school_name"))
        stype = _str(r.get("school_type"))
        year = _int(r.get("school_start_year"))
        if not year:
            errors.append(f"Missing school_start_year for student id={sid} — row skipped"); continue

        school_id = None
        if school_name:
            school_id = (await db.execute(
                text("SELECT id FROM schools WHERE lower(name)=lower(:n)"), {"n": school_name}
            )).scalar_one_or_none()

        # Skip if already exists
        exists = (await db.execute(
            text("SELECT id FROM student_exams WHERE student_id=:s AND school_start_year=:y "
                 "AND school_type=:st"),
            {"s": sid, "y": year, "st": stype}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue

        # Optional FKs
        exam_cat_name = _str(r.get("exam_category_name"))
        exam_cat_id = (await db.execute(
            text("SELECT id FROM exam_categories WHERE lower(name)=lower(:n)"), {"n": exam_cat_name}
        )).scalar_one_or_none() if exam_cat_name else None

        no_exam_txt = _str(r.get("no_exam_reason"))
        no_exam_id = (await db.execute(
            text("SELECT id FROM no_exam_reasons WHERE lower(reason)=lower(:n)"), {"n": no_exam_txt}
        )).scalar_one_or_none() if no_exam_txt else None

        no_admit_txt = _str(r.get("no_admit_reason"))
        no_admit_id = (await db.execute(
            text("SELECT id FROM no_admit_reasons WHERE lower(reason)=lower(:n)"), {"n": no_admit_txt}
        )).scalar_one_or_none() if no_admit_txt else None

        center_name = _str(r.get("exam_center_name"))
        center_id = (await db.execute(
            text("SELECT id FROM exam_centers WHERE lower(name)=lower(:n)"), {"n": center_name}
        )).scalar_one_or_none() if center_name else None

        adm_school_name = _str(r.get("admitted_school_name"))
        adm_school_id = (await db.execute(
            text("SELECT id FROM schools WHERE lower(name)=lower(:n)"), {"n": adm_school_name}
        )).scalar_one_or_none() if adm_school_name else None

        adm_class = _int(r.get("admission_class"))
        if adm_class not in (None, 5, 8):
            errors.append(f"Invalid admission_class '{adm_class}' — must be 5 or 8, ignored")
            adm_class = None

        res = await db.execute(text("""
            INSERT INTO student_exams (
                student_id, school_id, school_type, school_start_year,
                exam_category_id, eligible, form_received, applied, admit_card,
                appeared, no_exam_reason_id, selected, admitted,
                no_admit_reason_id, application_number, roll_number,
                exam_center_id, admitted_school_id, admission_class,
                created_at, updated_at)
            VALUES (
                :si, :sc, :st, :yr,
                :ec, :el, :fr, :ap, :ac,
                :ap2, :ne, :se, :ad,
                :na, :an, :rn,
                :cen, :as_, :cls,
                now(), now())
            RETURNING id
        """), {
            "si": sid, "sc": school_id, "st": stype, "yr": year,
            "ec": exam_cat_id,
            "el": _yn(r.get("eligible", "yes")),
            "fr": _yn(r.get("form_received")),
            "ap": _yn(r.get("applied")),
            "ac": _yn(r.get("admit_card")),
            "ap2": _yn(r.get("appeared")),
            "ne": no_exam_id,
            "se": _yn(r.get("selected")),
            "ad": _yn(r.get("admitted")),
            "na": no_admit_id,
            "an": _str(r.get("application_number")) or None,
            "rn": _str(r.get("roll_number")) or None,
            "cen": center_id,
            "as_": adm_school_id,
            "cls": adm_class,
        })
        exam_id = res.scalar_one()

        # Per-subject scores
        for key, val in r.items():
            if key.startswith("score_") and val not in (None, ""):
                subj_name = key[6:].replace("_", " ").strip()
                subj_id = (await db.execute(
                    text("SELECT id FROM subjects WHERE lower(name)=lower(:n)"), {"n": subj_name}
                )).scalar_one_or_none()
                if subj_id:
                    score = _float(val)
                    if score is not None:
                        await db.execute(
                            text("INSERT INTO student_exam_scores (exam_id, subject_id, score) "
                                 "VALUES (:e, :s, :sc) ON CONFLICT DO NOTHING"),
                            {"e": exam_id, "s": subj_id, "sc": score}
                        )
                else:
                    errors.append(f"Subject '{subj_name}' not found — score skipped")
        created += 1
    return _result(created, skipped, errors)


async def _import_progress(rows, db):
    """Import student_progress records. Unique on (student_id, school_id, academic_year)."""
    created = skipped = 0; errors = []
    for r in rows:
        # Resolve student — by id or by name+kutir
        student_id = _int(r.get("student_id"))
        if student_id:
            sid = (await db.execute(
                text("SELECT id FROM students WHERE id=:i"), {"i": student_id}
            )).scalar_one_or_none()
        else:
            first = _str(r.get("first_name")); last = _str(r.get("last_name"))
            kutir_name = _str(r.get("kutir_name"))
            kutir_id = (await db.execute(
                text("SELECT id FROM kutirs WHERE lower(name)=lower(:n)"), {"n": kutir_name}
            )).scalar_one_or_none() if kutir_name else None
            sid = (await db.execute(
                text("SELECT id FROM students WHERE lower(first_name)=lower(:f) "
                     "AND lower(last_name)=lower(:l) AND kutir_id=:k"),
                {"f": first, "l": last, "k": kutir_id}
            )).scalar_one_or_none() if (first and kutir_id) else None
        if not sid:
            ref = student_id or f"{r.get('first_name')} {r.get('last_name')}"
            errors.append(f"Student '{ref}' not found — row skipped"); continue

        # Resolve school
        school_name = _str(r.get("school_name"))
        school_id = None
        if school_name:
            school_id = (await db.execute(
                text("SELECT id FROM schools WHERE lower(name)=lower(:n)"), {"n": school_name}
            )).scalar_one_or_none()
        if not school_id:
            school_id_raw = _int(r.get("school_id"))
            if school_id_raw:
                school_id = (await db.execute(
                    text("SELECT id FROM schools WHERE id=:i"), {"i": school_id_raw}
                )).scalar_one_or_none()
        if not school_id:
            errors.append(f"School '{school_name}' not found for student id={sid} — row skipped"); continue

        academic_year = _int(r.get("academic_year"))
        if not academic_year:
            errors.append(f"Missing academic_year for student id={sid} — row skipped"); continue

        # Skip duplicates
        exists = (await db.execute(
            text("SELECT id FROM student_progress WHERE student_id=:s AND school_id=:sc AND academic_year=:y"),
            {"s": sid, "sc": school_id, "y": academic_year}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue

        status = _str(r.get("status", "enrolled"))
        if status not in ("enrolled", "transferred", "dropped_out", "graduated"):
            errors.append(f"Invalid status '{status}' for student id={sid} — defaulting to enrolled")
            status = "enrolled"

        pct_raw = r.get("previous_year_percentage")
        pct = _float(pct_raw) if pct_raw not in (None, "") else None

        await db.execute(text("""
            INSERT INTO student_progress
                (student_id, school_id, academic_year, class_in_year,
                 status, transfer_school, exit_reason,
                 previous_year_percentage, remarks, created_at, updated_at)
            VALUES
                (:si, :sc, :yr, :cl,
                 :st, :ts, :er,
                 :pct, :rm, now(), now())
        """), {
            "si": sid, "sc": school_id, "yr": academic_year,
            "cl": _int(r.get("class_in_year")),
            "st": status,
            "ts": _str(r.get("transfer_school")) or None,
            "er": _str(r.get("exit_reason")) or None,
            "pct": pct,
            "rm": _str(r.get("remarks")) or None,
        })
        created += 1
    return _result(created, skipped, errors)


async def _import_kutir_visits(rows, db):
    """Import kutir_visits. Unique on (kutir_id, visit_date)."""
    created = skipped = 0; errors = []
    VALID_PVR  = ("Matched", "Not Matched")
    VALID_WC   = ("Upto Date", "Partial Upto Date", "Not Uptodate")
    VALID_BOOK = ("Sufficient", "Lacking", "More than required")
    for r in rows:
        kutir_name = _str(r.get("kutir_name"))
        if not kutir_name:
            errors.append("Empty kutir_name — row skipped"); continue
        kutir_id = (await db.execute(
            text("SELECT id FROM kutirs WHERE lower(name)=lower(:n) LIMIT 1"), {"n": kutir_name}
        )).scalar_one_or_none()
        if not kutir_id:
            errors.append(f"Kutir '{kutir_name}' not found — row skipped"); continue

        visit_date = _date(r.get("visit_date"))
        if not visit_date:
            errors.append(f"Missing/invalid visit_date for kutir '{kutir_name}' — row skipped"); continue

        exists = (await db.execute(
            text("SELECT id FROM kutir_visits WHERE kutir_id=:k AND visit_date=:d"),
            {"k": kutir_id, "d": visit_date}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue

        visited_by_username = _str(r.get("visited_by"))
        visited_by_id = None
        if visited_by_username:
            visited_by_id = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u) LIMIT 1"), {"u": visited_by_username}
            )).scalar_one_or_none()
            if not visited_by_id:
                errors.append(f"User '{visited_by_username}' not found — visit imported without visitor")

        pvr = _str(r.get("physical_vs_registered", "Matched"))
        if pvr not in VALID_PVR:
            errors.append(f"Invalid physical_vs_registered '{pvr}' — defaulting to Matched"); pvr = "Matched"
        wc = _str(r.get("workbook_completion", "Upto Date"))
        if wc not in VALID_WC:
            errors.append(f"Invalid workbook_completion '{wc}' — defaulting to Upto Date"); wc = "Upto Date"
        ba = _str(r.get("book_availability", "Sufficient"))
        if ba not in VALID_BOOK:
            errors.append(f"Invalid book_availability '{ba}' — defaulting to Sufficient"); ba = "Sufficient"

        def rating(key):
            v = _int(r.get(key))
            return max(1, min(5, v)) if v is not None else 3

        await db.execute(text("""
            INSERT INTO kutir_visits (
                kutir_id, visited_by_id, visit_date,
                avg_attendance_morning, avg_attendance_evening,
                follow_timetable, kutir_closed,
                plan_hindi, plan_math, plan_english, timetable_plan_reason,
                math_topics_pre, math_topics_upper, english_topics_pre, english_topics_upper,
                timeslot_reason, grs_prep_remarks,
                physical_vs_registered, workbook_percentage, workbook_completion, book_availability,
                cleanliness, hindi_proficiency, english_proficiency, maths_proficiency,
                evs_proficiency, reasoning_proficiency, material_management, kutir_performance, staff_behavior,
                reg_admission_forms, reg_attendance_students, reg_daily_activity, reg_observation,
                reg_students_data, reg_attendance_teachers, reg_students_documents,
                regular_students_morning, regular_students_evening,
                timeslot_bal_sabha, timeslot_sports, timeslot_yoga, timeslot_value_ed, timeslot_gk_map,
                final_remarks, created_at, updated_at
            ) VALUES (
                :ki, :vb, :vd,
                :am, :ae,
                :ft, :kc,
                :ph, :pm, :pe, :tpr,
                :mtp, :mtu, :etp, :etu,
                :tr, :gpr,
                :pvr, :wp, :wc, :ba,
                :cl, :hp, :ep, :mp, :ev, :rp, :mm, :kp, :sb,
                :ra, :rs, :rd, :ro, :rsd, :rt, :rdoc,
                :regm, :rege,
                :tbs, :tsp, :tyo, :tve, :tgk,
                :fr, now(), now()
            )
        """), {
            "ki": kutir_id, "vb": visited_by_id, "vd": visit_date,
            "am": _int(r.get("avg_attendance_morning")),
            "ae": _int(r.get("avg_attendance_evening")),
            "ft": _yn(r.get("follow_timetable")),
            "kc": _yn(r.get("kutir_closed")),
            "ph": _yn(r.get("plan_hindi")),
            "pm": _yn(r.get("plan_math")),
            "pe": _yn(r.get("plan_english")),
            "tpr": _str(r.get("timetable_plan_reason")) or None,
            "mtp": _str(r.get("math_topics_pre")) or None,
            "mtu": _str(r.get("math_topics_upper")) or None,
            "etp": _str(r.get("english_topics_pre")) or None,
            "etu": _str(r.get("english_topics_upper")) or None,
            "tr": _str(r.get("timeslot_reason")) or None,
            "gpr": _str(r.get("grs_prep_remarks")) or None,
            "pvr": pvr,
            "wp": _int(r.get("workbook_percentage")) or 0,
            "wc": wc, "ba": ba,
            "cl": rating("cleanliness"),
            "hp": rating("hindi_proficiency"),
            "ep": rating("english_proficiency"),
            "mp": rating("maths_proficiency"),
            "ev": rating("evs_proficiency"),
            "rp": rating("reasoning_proficiency"),
            "mm": rating("material_management"),
            "kp": rating("kutir_performance"),
            "sb": _int(r.get("staff_behavior")),
            "ra": _yn(r.get("reg_admission_forms")),
            "rs": _yn(r.get("reg_attendance_students")),
            "rd": _yn(r.get("reg_daily_activity")),
            "ro": _yn(r.get("reg_observation")),
            "rsd": _yn(r.get("reg_students_data")),
            "rt": _yn(r.get("reg_attendance_teachers")),
            "rdoc": _yn(r.get("reg_students_documents")),
            "regm": _int(r.get("regular_students_morning")),
            "rege": _int(r.get("regular_students_evening")),
            "tbs": _yn(r.get("timeslot_bal_sabha")),
            "tsp": _yn(r.get("timeslot_sports")),
            "tyo": _yn(r.get("timeslot_yoga")),
            "tve": _yn(r.get("timeslot_value_ed")),
            "tgk": _yn(r.get("timeslot_gk_map")),
            "fr": _str(r.get("final_remarks")) or None,
        })
        created += 1
    return _result(created, skipped, errors)


# ── Workbook processor ────────────────────────────────────────────────────────

SHEET_ORDER = [
    ("0_Users",               lambda rows, db: _import_users(rows, db)),
    ("1_Zones",               lambda rows, db: _import_zones(rows, db)),
    ("2_Categories",          lambda rows, db: _import_simple(rows, db, "categories", "name")),
    ("3_SubCategories",       lambda rows, db: _import_subcategories(rows, db)),
    ("4_Donors",              lambda rows, db: _import_donors(rows, db)),
    ("5_SchoolTypes",         lambda rows, db: _import_simple(rows, db, "school_types", "name")),
    ("6_ExamCategories",      lambda rows, db: _import_simple(rows, db, "exam_categories", "name")),
    ("7_NoExamReasons",       lambda rows, db: _import_simple(rows, db, "no_exam_reasons", "reason")),
    ("8_NoAdmitReasons",      lambda rows, db: _import_simple(rows, db, "no_admit_reasons", "reason")),
    ("9_Subjects",            lambda rows, db: _import_simple(rows, db, "subjects", "name")),
    ("10_Districts",          lambda rows, db: _import_districts(rows, db)),
    ("11_Areas",              lambda rows, db: _import_areas(rows, db)),
    ("12_Schools",            lambda rows, db: _import_schools(rows, db)),
    ("13_ExamCenters",        lambda rows, db: _import_exam_centers(rows, db)),
    ("14_Clusters",           lambda rows, db: _import_clusters(rows, db)),
    ("15_ExamTypes",          lambda rows, db: _import_exam_types(rows, db)),
    ("16_SubjectsByExamType", lambda rows, db: _import_exam_type_subjects(rows, db)),
    ("17_Kutirs",             lambda rows, db: _import_kutirs(rows, db)),
    ("18_Students",          lambda rows, db: _import_students(rows, db)),
    # ── Depend on Students + Schools ─────────────────────────────────────────
    ("19_Admissions",        lambda rows, db: _import_admissions(rows, db)),
    ("20_Progress",          lambda rows, db: _import_progress(rows, db)),
    # ── Depend on Kutirs + Users ──────────────────────────────────────────────
    ("21_KutirVisits",       lambda rows, db: _import_kutir_visits(rows, db)),
]


async def process_workbook(data: bytes, db: AsyncSession) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    results = []
    for sheet_name, handler in SHEET_ORDER:
        if sheet_name not in wb.sheetnames:
            results.append({"sheet": sheet_name, "total": 0, "created": 0, "skipped": 0, "errors": ["Sheet not found in uploaded file"]})
            continue
        ws = wb[sheet_name]
        # Auto-detect header row: if row 1 has short string cells (no long note), use it as headers.
        # Row 1 = headers, Row 2 = example/sample row (always skipped), data starts row 3
        all_rows = list(ws.iter_rows(values_only=True))
        if len(all_rows) < 1:
            results.append({"sheet": sheet_name, "total": 0, "created": 0, "skipped": 0, "errors": []})
            continue
        # Row 1=column titles (headers), Row 2=sample data (always skipped), Row 3+=data
        if len(all_rows) < 1:
            results.append({"sheet": sheet_name, "total": 0, "created": 0, "skipped": 0, "errors": []})
            continue
        headers = [_str(c).lower().replace(" ", "_") for c in all_rows[0]]
        data_rows = []
        for row in all_rows[2:]:  # skip headers (row 0) and sample row (row 1)
            if all(v is None or _str(v) == "" for v in row):
                break
            data_rows.append(dict(zip(headers, row)))
        total = len(data_rows)
        if not data_rows:
            results.append({"sheet": sheet_name, "total": 0, "created": 0, "skipped": 0, "errors": []})
            continue
        try:
            r = await handler(data_rows, db)
            await db.commit()
        except Exception as e:
            await db.rollback()
            r = {"created": 0, "skipped": 0, "errors": [f"Sheet error: {e}"]}
        r["sheet"] = sheet_name
        r["total"] = total
        results.append(r)
    return results


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=ImportResponse)
async def upload_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    if not file.filename or not file.filename.endswith((".xlsx", ".xlsm")):
        raise HTTPException(400, "Please upload an .xlsx file")
    data = await file.read()
    results = await process_workbook(data, db)
    totals = {"rows": 0, "created": 0, "skipped": 0, "errors": 0}
    for r in results:
        totals["rows"]    += r.get("total", 0)
        totals["created"] += r.get("created", 0)
        totals["skipped"] += r.get("skipped", 0)
        totals["errors"]  += len(r.get("errors", []))
    return {"results": results, "totals": totals}


@router.get("/template")
async def download_template(_=Depends(require_admin)):
    base = Path(__file__).parent.parent.parent.parent  # project root
    path = base / "GRS_Import_Template.xlsx"
    if not path.exists():
        raise HTTPException(404, "Template file not found")
    return FileResponse(
        str(path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="GRS_Import_Template.xlsx",
    )


# ── Delete All Data ───────────────────────────────────────────────────────────

class DeleteDataResponse(BaseModel):
    deleted: dict[str, int]   # table → row count deleted

@router.delete("/reset", response_model=DeleteDataResponse)
async def reset_data(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Delete all data from every table EXCEPT users and their geo mappings.
    Deletes in FK-safe order (children before parents).
    """
    # Tables in dependency order — leaves first, roots last.
    # Junction tables must come before their parent tables.
    tables = [
        # Student-level leaf tables
        "student_exam_scores",
        "student_exams",
        "student_progress",
        "kutir_visits",
        "students",
        # Lookup / reference tables
        "exam_type_subjects",
        "exam_type_school_types",
        "exam_types",
        "school_types",
        "no_admit_reasons",
        "no_exam_reasons",
        "exam_categories",
        "sub_categories",
        "categories",
        "subjects",
        # Infrastructure
        "exam_centers",
        "schools",
        "donors",
        "kutirs",
        # Geography (zones last because districts → areas → clusters reference them)
        "clusters",
        "areas",
        "districts",
        "zones",
    ]

    deleted: dict[str, int] = {}
    for table in tables:
        result = await db.execute(text(f"DELETE FROM {table}"))
        deleted[table] = result.rowcount  # type: ignore[attr-defined]

    await db.commit()
    return {"deleted": deleted}
