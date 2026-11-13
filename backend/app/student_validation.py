"""Validate student create/update payloads (validate-on-write; DB may have legacy nulls)."""
from __future__ import annotations

from datetime import date
from typing import Any, Mapping

from fastapi import HTTPException

_REQUIRED_STRINGS: tuple[tuple[str, str], ...] = (
    ("first_name", "First name"),
    ("last_name", "Last name"),
    ("phone", "Phone"),
    ("father_name", "Father name"),
    ("mother_name", "Mother name"),
)


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def validate_student_write(data: Mapping[str, Any]) -> None:
    """Raise HTTP 422 with a single friendly message when required fields are missing."""
    missing: list[str] = []

    if not data.get("kutir_id"):
        missing.append("Kutir")
    dob = data.get("dob")
    if dob is None or (isinstance(dob, str) and not dob.strip()):
        missing.append("Date of birth")
    if not data.get("category_id"):
        missing.append("Category")

    gender = data.get("gender")
    if gender not in ("Boy", "Girl"):
        missing.append("Gender")

    for key, label in _REQUIRED_STRINGS:
        if _is_blank(data.get(key)):
            missing.append(label)

    if missing:
        raise HTTPException(422, f"Required: {', '.join(missing)}")


def student_merged_for_update(existing, update: Mapping[str, Any]) -> dict[str, Any]:
    """Merge PATCH onto an ORM Student for validate-on-write."""
    merged: dict[str, Any] = {
        "kutir_id": existing.kutir_id,
        "first_name": existing.first_name,
        "last_name": existing.last_name,
        "gender": existing.gender,
        "dob": existing.dob,
        "phone": existing.phone,
        "email": existing.email,
        "father_name": existing.father_name,
        "mother_name": existing.mother_name,
        "category_id": existing.category_id,
        "sub_category_id": existing.sub_category_id,
        "alt_contact_name": existing.alt_contact_name,
        "alt_contact_phone": existing.alt_contact_phone,
        "aadhaar": existing.aadhaar,
        "category_cert": existing.category_cert,
        "birth_cert": existing.birth_cert,
        "residence_proof": existing.residence_proof,
        "medical": existing.medical,
    }
    for key, value in update.items():
        if key in merged:
            merged[key] = value
    if isinstance(merged.get("dob"), date):
        pass  # keep date object for validators / dumps
    return merged
