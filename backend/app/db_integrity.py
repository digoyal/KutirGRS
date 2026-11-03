"""Map SQLAlchemy IntegrityError to HTTP status + client-safe detail."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.admission_uniqueness import admission_duplicate_detail


def _constraint_message(raw: str, *, school_start_year: int | None) -> tuple[int, str]:
    lower = raw.lower()
    if "uq_student_school_type_year" in lower:
        if school_start_year is not None:
            return 409, admission_duplicate_detail(school_start_year)
        return 409, "Student already has an admission for this school type and academic year."
    if "uq_student_progress_student" in lower:
        return 409, "Student already has a progress record."
    if "foreignkeyviolation" in lower or "foreign key constraint" in lower:
        return 400, "Save failed: a selected lookup value is invalid or no longer exists."
    if school_start_year is not None:
        return 409, admission_duplicate_detail(school_start_year)
    return 409, "Save failed due to a database constraint conflict."


def raise_http_for_integrity(err: IntegrityError, *, school_start_year: int | None = None) -> None:
    raw = str(getattr(err, "orig", err))
    status, detail = _constraint_message(raw, school_start_year=school_start_year)
    raise HTTPException(status, detail) from err
