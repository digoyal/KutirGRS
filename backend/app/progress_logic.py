"""Student progress journey: track, per-class marks, enablement, admission bootstrap."""
from __future__ import annotations

from decimal import Decimal
from typing import Optional

from fastapi import HTTPException

TRACK_SIX_TWELVE = "six_twelve"
TRACK_NINE_TWELVE = "nine_twelve"

PROGRESS_STATUSES_READ = frozenset({
    "enrolled",
    "promoted",
    "transferred",
    "dropped_out",
    "graduated",
    "admitted_to_college",
})

PROGRESS_STATUSES_WRITABLE = frozenset({
    "enrolled",
    "promoted",
    "dropped_out",
    "graduated",
    "admitted_to_college",
})

MARK_CLASSES = (6, 7, 8, 9, 10, 11, 12)


def track_from_admission_class(admission_class: Optional[int]) -> str:
    if admission_class == 5:
        return TRACK_SIX_TWELVE
    if admission_class == 8:
        return TRACK_NINE_TWELVE
    raise ValueError("admission_class must be 5 or 8")


def classes_for_track(track: str) -> list[int]:
    if track == TRACK_SIX_TWELVE:
        return [6, 7, 8, 9, 10, 11, 12]
    if track == TRACK_NINE_TWELVE:
        return [9, 10, 11, 12]
    raise ValueError(f"unknown track: {track}")


def entry_class_for_track(track: str) -> int:
    return classes_for_track(track)[0]


def mark_attr(class_num: int) -> str:
    return f"marks_{class_num}"


def get_mark(progress, class_num: int) -> Optional[Decimal]:
    return getattr(progress, mark_attr(class_num), None)


def enabled_mark_classes(progress) -> list[int]:
    """Entry class always in chain; each next class unlocks when the previous mark is set."""
    classes = classes_for_track(progress.track)
    enabled: list[int] = []
    for i, c in enumerate(classes):
        if i == 0:
            enabled.append(c)
            continue
        if get_mark(progress, classes[i - 1]) is not None:
            enabled.append(c)
        else:
            break
    return enabled


def validate_status_write(current: str, new: Optional[str]) -> str:
    if new is None:
        return current
    if new not in PROGRESS_STATUSES_READ:
        raise HTTPException(400, f"Invalid progress status: {new}")
    if new == "transferred":
        raise HTTPException(400, "Status 'transferred' is no longer selectable.")
    if new not in PROGRESS_STATUSES_WRITABLE and new != current:
        raise HTTPException(400, f"Status '{new}' is not allowed.")
    return new


def validate_marks_write(progress, updates: dict) -> None:
    """Reject writes to mark columns that are not enabled."""
    enabled = set(enabled_mark_classes(progress))
    for key, val in updates.items():
        if not key.startswith("marks_"):
            continue
        if val is None:
            continue
        try:
            cls = int(key.split("_")[1])
        except (IndexError, ValueError):
            continue
        if cls not in enabled:
            raise HTTPException(
                400,
                f"Marks for class {cls} are not editable until prior year marks are entered.",
            )


def apply_promoted_status(progress) -> None:
    """After marks change: enrolled → promoted when entry-year mark is set."""
    if progress.status not in ("enrolled", "promoted"):
        return
    entry = entry_class_for_track(progress.track)
    if get_mark(progress, entry) is not None:
        progress.status = "promoted"


def initial_progress_fields_from_exam(exam) -> dict:
    track = track_from_admission_class(exam.admission_class)
    return {
        "student_id": exam.student_id,
        "school_id": exam.admitted_school_id,
        "academic_year": exam.school_start_year + 1,
        "class_in_year": exam.admission_class + 1,
        "track": track,
        "status": "enrolled",
    }


def merge_progress_payload(progress, data: dict) -> dict:
    """Apply mark/status rules to an update/create payload."""
    validate_marks_write(progress, data)
    if "status" in data:
        data["status"] = validate_status_write(progress.status, data["status"])
    return data


async def ensure_progress_from_admitted_exam(db, exam) -> None:
    """Create or refresh progress when a student is admitted (idempotent)."""
    if not exam.admitted or not exam.admitted_school_id:
        return
    if exam.admission_class not in (5, 8):
        return
    from sqlalchemy import select
    from app.models.students import StudentProgress

    result = await db.execute(
        select(StudentProgress).where(StudentProgress.student_id == exam.student_id).limit(1)
    )
    existing = result.scalar_one_or_none()
    fields = initial_progress_fields_from_exam(exam)
    if existing:
        for key, val in fields.items():
            if key == "student_id":
                continue
            setattr(existing, key, val)
        return
    db.add(StudentProgress(**fields))


async def infer_track_for_student(db, student_id: int) -> str:
    from sqlalchemy import select
    from app.models.students import StudentExam

    result = await db.execute(
        select(StudentExam)
        .where(StudentExam.student_id == student_id, StudentExam.admitted.is_(True))
        .limit(1)
    )
    exam = result.scalar_one_or_none()
    if not exam or exam.admission_class not in (5, 8):
        raise HTTPException(
            400,
            "Cannot infer progress track: student needs an admitted exam with class 5 or 8.",
        )
    return track_from_admission_class(exam.admission_class)
