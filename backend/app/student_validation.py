"""Validate student create/update payloads (validate-on-write; DB may have legacy nulls)."""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Mapping, MutableMapping

from fastapi import HTTPException

_REQUIRED_STRINGS: tuple[tuple[str, str], ...] = (
    ("first_name", "First name"),
    ("phone", "Phone"),
    ("father_name", "Father name"),
    ("mother_name", "Mother name"),
)

_PHONE_FIELDS: tuple[tuple[str, str, bool], ...] = (
    ("phone", "Phone", True),
    ("alt_contact_phone", "Alt phone", False),
)

_INDIAN_MOBILE_RE = re.compile(r"^\d{10}$")


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _strip_phone_separators(s: str) -> str:
    return re.sub(r"[\s\-]", "", s)


def _phone_digits_candidate(raw: Any) -> str:
    """Normalize common Indian mobile input to a digit string for validation."""
    if raw is None:
        return ""
    s = str(raw).strip()
    if not s:
        return ""
    m = re.match(r"^(\d+)\.0+$", s)
    if m:
        s = m.group(1)
    s = _strip_phone_separators(s)
    if s.startswith("+91"):
        s = s[3:]
    elif s.startswith("91") and len(s) == 12 and s.isdigit():
        s = s[2:]
    return s


def normalize_indian_mobile(
    raw: Any,
    *,
    required: bool = False,
    field_label: str = "Phone",
) -> tuple[str | None, str | None]:
    """
    Return (normalized 10-digit string or None, error message or None).
    Blank input is OK when required=False.
    """
    if _is_blank(raw):
        if required:
            return None, f"{field_label} must be exactly 10 digits"
        return None, None

    s = _phone_digits_candidate(raw)
    if not s:
        if required:
            return None, f"{field_label} must be exactly 10 digits"
        return None, None
    if not s.isdigit():
        return None, f"{field_label} must be exactly 10 digits"
    if not _INDIAN_MOBILE_RE.match(s):
        return None, f"{field_label} must be exactly 10 digits"
    return s, None


def normalize_student_phones(data: MutableMapping[str, Any]) -> None:
    """Validate phone fields and write normalized 10-digit values into data."""
    for key, label, required in _PHONE_FIELDS:
        if key == "alt_contact_phone" and _is_blank(data.get(key)):
            if key in data:
                data[key] = None
            continue
        norm, err = normalize_indian_mobile(
            data.get(key),
            required=required,
            field_label=label,
        )
        if err:
            raise HTTPException(422, err)
        if key in data or norm is not None:
            data[key] = norm


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

    for key, label, required in _PHONE_FIELDS:
        if key == "alt_contact_phone" and _is_blank(data.get(key)):
            continue
        _, err = normalize_indian_mobile(
            data.get(key),
            required=required,
            field_label=label,
        )
        if err:
            raise HTTPException(422, err)


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