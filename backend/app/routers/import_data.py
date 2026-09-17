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

VALID_SCHOOL_TYPES = {"EMRS","JNV","KSP","MRS","GNV","KGBV","SportsBoys","SportsGirls","Other"}
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
            INSERT INTO users (username, hashed_password, first_name, last_name,
                               email, phone, title, is_active, is_superuser,
                               created_at, updated_at)
            VALUES (:u, :pw, :fn, :ln, :em, :ph, :ti, :ia, false, now(), now())
        """), {
            "u": uname, "pw": hashed,
            "fn": _str(r.get("first_name")), "ln": _str(r.get("last_name")),
            "em": _str(r.get("email")), "ph": _str(r.get("phone")),
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
                text("SELECT id FROM users WHERE lower(username)=lower(:u)"), {"u": username}
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
                text("INSERT INTO zones (name) VALUES (:n) RETURNING id"), {"n": name}
            )).scalar_one()
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
                text("SELECT id FROM users WHERE lower(username)=lower(:u)"), {"u": username}
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
                text("INSERT INTO districts (name, zone_id) VALUES (:n, :z) RETURNING id"),
                {"n": name, "z": zone_id}
            )).scalar_one()
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
            text("SELECT id FROM districts WHERE lower(name)=lower(:n)"), {"n": dist_name}
        )).scalar_one_or_none()
        if not dist_id:
            errors.append(f"District '{dist_name}' not found for area '{raw_name}'"); continue
        username = _str(r.get("userid"))
        uid = None
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u)"), {"u": username}
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
                text("INSERT INTO areas (name, district_id) VALUES (:n, :d) RETURNING id"),
                {"n": name, "d": dist_id}
            )).scalar_one()
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
                text("SELECT id FROM users WHERE lower(username)=lower(:u)"), {"u": username}
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
                text("INSERT INTO clusters (name, area_id) VALUES (:n, :a) RETURNING id"),
                {"n": name, "a": area_id}
            )).scalar_one()
            created += 1
            if uid:
                await db.execute(
                    text("INSERT INTO user_clusters (user_id, cluster_id) VALUES (:u, :c) ON CONFLICT DO NOTHING"),
                    {"u": uid, "c": cluster_id}
                )
    return _result(created, skipped, errors)


async def _import_simple(rows, db, table, field):
    created = skipped = 0; errors = []
    for r in rows:
        val = _str(r.get(field))
        if not val:
            errors.append(f"Empty {field} — row skipped"); continue
        exists = (await db.execute(
            text(f"SELECT id FROM {table} WHERE lower({field})=lower(:v)"), {"v": val}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        await db.execute(text(f"INSERT INTO {table} ({field}) VALUES (:v)"), {"v": val})
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
            text("INSERT INTO sub_categories (name, category_id) VALUES (:n, :c)"),
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
        stype = _str(r.get("school_type", "EMRS"))
        if stype not in VALID_SCHOOL_TYPES:
            errors.append(f"Invalid school_type '{stype}' for '{name}'"); continue
        exists = (await db.execute(
            text("SELECT id FROM schools WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        dist_name = _str(r.get("district_name"))
        dist_id = None
        if dist_name:
            dist_id = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n)"), {"n": dist_name}
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
                text("SELECT id FROM districts WHERE lower(name)=lower(:n)"), {"n": dist_name}
            )).scalar_one_or_none()
        await db.execute(text("""
            INSERT INTO exam_centers (name, street, city, district_id, state, pincode)
            VALUES (:n, :sr, :ci, :di, :sa, :pi)
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
            text("INSERT INTO donors (name, contact, notes) VALUES (:n, :c, :no)"),
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
            text("SELECT id FROM kutirs WHERE lower(name)=lower(:n)"), {"n": name}
        )).scalar_one_or_none()
        if exists:
            skipped += 1; continue
        cluster_name = _str(r.get("cluster_name"))
        cluster_id = (await db.execute(
            text("SELECT id FROM clusters WHERE lower(name)=lower(:n)"), {"n": cluster_name}
        )).scalar_one_or_none()
        if not cluster_id:
            errors.append(f"Cluster '{cluster_name}' not found for kutir '{name}'"); continue
        dist_name = _str(r.get("district_name"))
        dist_id = None
        if dist_name:
            dist_id = (await db.execute(
                text("SELECT id FROM districts WHERE lower(name)=lower(:n)"), {"n": dist_name}
            )).scalar_one_or_none()
        ktype = KUTIR_TYPE_MAP.get(_str(r.get("kutir_type", "")).lower(), "Seva Kutir")
        donor_name = _str(r.get("donor_name"))
        donor_id = None
        if donor_name:
            donor_id = (await db.execute(
                text("SELECT id FROM donors WHERE lower(name)=lower(:n)"), {"n": donor_name}
            )).scalar_one_or_none()
            if not donor_id:
                errors.append(f"Donor '{donor_name}' not found — kutir '{name}' imported without donor")
        await db.execute(text("""
            INSERT INTO kutirs (name, kutir_type, cluster_id, district_id, village, street,
                                state, pincode, donor_id, enrollment_5th, enrollment_8th,
                                created_at, updated_at)
            VALUES (:n, :kt, :cl, :di, :vi, :sr, :sa, :pi, :do, :e5, :e8, now(), now())
        """), {"n": name, "kt": ktype, "cl": cluster_id, "di": dist_id,
               "vi": _str(r.get("village")) or None,
               "sr": _str(r.get("street")) or None,
               "sa": _state(r.get("state")),
               "pi": _str(r.get("pincode")) or None,
               "do": donor_id,
               "e5": _int(r.get("enrollment_5th")),
               "e8": _int(r.get("enrollment_8th"))})
        kutir_id = (await db.execute(text("SELECT id FROM kutirs WHERE lower(name)=lower(:n)"), {"n": name})).scalar_one()
        created += 1
        username = _str(r.get("userid"))
        if username:
            uid = (await db.execute(
                text("SELECT id FROM users WHERE lower(username)=lower(:u)"), {"u": username}
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


async def _import_school_type_subjects(rows, db):
    created = skipped = 0; errors = []
    for r in rows:
        stype = _str(r.get("school_type"))
        if not stype or stype not in VALID_SCHOOL_TYPES:
            errors.append(f"Invalid school_type '{stype}' — row skipped"); continue
        subj_raw = _str(r.get("subjects", ""))
        subj_names = [s.strip() for s in subj_raw.split(",") if s.strip()]
        sts_id = (await db.execute(
            text("SELECT id FROM school_type_subjects WHERE school_type=:st"), {"st": stype}
        )).scalar_one_or_none()
        if not sts_id:
            res = await db.execute(
                text("INSERT INTO school_type_subjects (school_type) VALUES (:st) RETURNING id"),
                {"st": stype}
            )
            sts_id = res.scalar_one()
            created += 1
        else:
            await db.execute(
                text("DELETE FROM school_type_subject_subjects WHERE school_type_subject_id=:id"),
                {"id": sts_id}
            )
            skipped += 1
        for sn in subj_names:
            subj_id = (await db.execute(
                text("SELECT id FROM subjects WHERE lower(name)=lower(:n)"), {"n": sn}
            )).scalar_one_or_none()
            if subj_id:
                await db.execute(
                    text("INSERT INTO school_type_subject_subjects (school_type_subject_id, subject_id) "
                         "VALUES (:sid, :subj) ON CONFLICT DO NOTHING"),
                    {"sid": sts_id, "subj": subj_id}
                )
            else:
                errors.append(f"Subject '{sn}' not found — skipped for '{stype}'")
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
        if not stype or stype not in VALID_SCHOOL_TYPES:
            errors.append(f"Missing/invalid school_type for student id={sid} — row skipped"); continue
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
            text("SELECT id FROM no_exam_reasons WHERE lower(text)=lower(:n)"), {"n": no_exam_txt}
        )).scalar_one_or_none() if no_exam_txt else None

        no_admit_txt = _str(r.get("no_admit_reason"))
        no_admit_id = (await db.execute(
            text("SELECT id FROM no_admit_reasons WHERE lower(text)=lower(:n)"), {"n": no_admit_txt}
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


# ── Workbook processor ────────────────────────────────────────────────────────

SHEET_ORDER = [
    ("0_Users",              lambda rows, db: _import_users(rows, db)),
    ("1_Zones",              lambda rows, db: _import_zones(rows, db)),
    ("2_Districts",          lambda rows, db: _import_districts(rows, db)),
    ("3_Areas",              lambda rows, db: _import_areas(rows, db)),
    ("4_Clusters",           lambda rows, db: _import_clusters(rows, db)),
    ("5_Kutirs",             lambda rows, db: _import_kutirs(rows, db)),
    ("6_Categories",         lambda rows, db: _import_simple(rows, db, "categories", "name")),
    ("7_SubCategories",      lambda rows, db: _import_subcategories(rows, db)),
    ("8_Schools",            lambda rows, db: _import_schools(rows, db)),
    ("9_ExamCenters",        lambda rows, db: _import_exam_centers(rows, db)),
    ("10_Donors",            lambda rows, db: _import_donors(rows, db)),
    ("11_ExamCategories",    lambda rows, db: _import_simple(rows, db, "exam_categories", "name")),
    ("12_NoExamReasons",     lambda rows, db: _import_simple(rows, db, "no_exam_reasons", "text")),
    ("13_NoAdmitReasons",    lambda rows, db: _import_simple(rows, db, "no_admit_reasons", "text")),
    ("14_Subjects",          lambda rows, db: _import_simple(rows, db, "subjects", "name")),
    ("15_SchoolTypeSubjects",lambda rows, db: _import_school_type_subjects(rows, db)),
    ("16_Students",          lambda rows, db: _import_students(rows, db)),
    ("17_Admissions",        lambda rows, db: _import_admissions(rows, db)),
]


async def process_workbook(data: bytes, db: AsyncSession) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    results = []
    for sheet_name, handler in SHEET_ORDER:
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        # Row 1 = note, row 2 = headers, row 3+ = data
        all_rows = list(ws.iter_rows(values_only=True))
        if len(all_rows) < 2:
            results.append({"sheet": sheet_name, "total": 0, "created": 0, "skipped": 0, "errors": []})
            continue
        headers = [_str(c).lower().replace(" ", "_") for c in all_rows[1]]
        data_rows = []
        for row in all_rows[2:]:
            if all(v is None or _str(v) == "" for v in row):
                break   # stop on first completely empty row
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
        # School type subjects junction + table
        "school_type_subject_subjects",
        "school_type_subjects",
        # Lookup / reference tables
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
