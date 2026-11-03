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

# User-selected terminal statuses — do not overwrite via mark sync on save.
PROGRESS_STATUSES_MANUAL = frozenset({
    "dropped_out",
    "admitted_to_college",
})

# Selectable statuses once 12th mark is recorded (PATCH / form dropdown).
PROGRESS_STATUSES_AFTER_12TH_MARK = frozenset({
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


def mark_editing_locked(progress) -> bool:
    """No further mark edits after graduation or when 12th mark is recorded."""
    if progress.status == "graduated":
        return True
    return get_mark(progress, 12) is not None


def editable_mark_class(progress) -> Optional[int]:
    """The single class column that may receive mark writes (current class_in_year on track)."""
    if mark_editing_locked(progress):
        return None
    classes = classes_for_track(progress.track)
    ciy = progress.class_in_year
    if ciy is not None and ciy in classes:
        return ciy
    return entry_class_for_track(progress.track)


def enabled_mark_classes(progress) -> list[int]:
    """Current class_in_year plus the previous track class when that mark is already set (typo fix)."""
    if mark_editing_locked(progress):
        return []
    current = editable_mark_class(progress)
    if current is None:
        return []
    classes = classes_for_track(progress.track)
    idx = classes.index(current)
    enabled: list[int] = [current]
    if idx > 0:
        prev = classes[idx - 1]
        if get_mark(progress, prev) is not None:
            enabled.insert(0, prev)
    return enabled


def _marks_12_effective(progress, updates: Optional[dict] = None) -> bool:
    if get_mark(progress, 12) is not None:
        return True
    if updates and updates.get("marks_12") is not None:
        return True
    return False


def validate_status_write(
    progress,
    new: Optional[str],
    updates: Optional[dict] = None,
) -> str:
    current = progress.status
    if new is None:
        return current
    if new not in PROGRESS_STATUSES_READ:
        raise HTTPException(400, f"Invalid progress status: {new}")
    if new == "transferred":
        raise HTTPException(400, "Status 'transferred' is no longer selectable.")
    if new not in PROGRESS_STATUSES_WRITABLE and new != current:
        raise HTTPException(400, f"Status '{new}' is not allowed.")
    if _marks_12_effective(progress, updates):
        if new in PROGRESS_STATUSES_AFTER_12TH_MARK or new == current:
            return new
        raise HTTPException(
            400,
            "After 12th marks are recorded, status must be Graduated or Admitted to College.",
        )
    return new


def _mark_values_equal(a: Optional[Decimal], b) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    if not isinstance(b, Decimal):
        b = Decimal(str(b))
    return a == b


def validate_marks_write(progress, updates: dict) -> None:
    """Reject changes to mark columns outside enabled_mark_classes."""
    enabled = set(enabled_mark_classes(progress))
    for key, val in updates.items():
        if not key.startswith("marks_"):
            continue
        try:
            cls = int(key.split("_")[1])
        except (IndexError, ValueError):
            continue
        if cls in enabled:
            continue
        current = get_mark(progress, cls)
        if _mark_values_equal(current, val):
            continue
        allowed = ", ".join(str(c) for c in sorted(enabled))
        raise HTTPException(
            400,
            f"Only marks for class(es) {allowed} can be edited.",
        )


def snapshot_marks(progress) -> dict[int, Optional[Decimal]]:
    return {c: get_mark(progress, c) for c in classes_for_track(progress.track)}


def sync_class_year_from_marks(progress, marks_before: dict[int, Optional[Decimal]]) -> None:
    """Advance class/year when a track mark is newly filled (re-save unchanged marks: no-op)."""
    classes = classes_for_track(progress.track)
    for c in classes:
        before = marks_before.get(c)
        after = get_mark(progress, c)
        if before is not None or after is None:
            continue
        idx = classes.index(c)
        if idx + 1 < len(classes):
            if progress.academic_year is not None:
                progress.academic_year += 1
            progress.class_in_year = classes[idx + 1]
        else:
            progress.class_in_year = c


def recompute_class_in_year_from_marks(progress) -> None:
    """Set current class from how many track marks are filled (import / bulk sanity)."""
    classes = classes_for_track(progress.track)
    n = sum(1 for c in classes if get_mark(progress, c) is not None)
    progress.class_in_year = classes[-1] if n >= len(classes) else classes[n]


def apply_promoted_status(progress) -> None:
    """After marks change: enrolled → promoted when entry-year mark is set."""
    if progress.status not in ("enrolled", "promoted"):
        return
    entry = entry_class_for_track(progress.track)
    if get_mark(progress, entry) is not None:
        progress.status = "promoted"


def apply_graduated_status(progress) -> None:
    """After marks change: 12th mark recorded → graduated (both tracks end at class 12)."""
    if progress.status in PROGRESS_STATUSES_MANUAL:
        return
    if get_mark(progress, 12) is not None:
        progress.status = "graduated"


def admitted_school_id_for_exam(exam):
    """UI sets admitted_school_id; imports may only have school_id."""
    return exam.admitted_school_id or getattr(exam, "school_id", None)


def initial_progress_fields_from_exam(exam) -> dict:
    track = track_from_admission_class(exam.admission_class)
    school_id = admitted_school_id_for_exam(exam)
    return {
        "student_id": exam.student_id,
        "school_id": school_id,
        "academic_year": exam.school_start_year + 1,
        "class_in_year": exam.admission_class + 1,
        "track": track,
        "status": "enrolled",
    }


def merge_progress_payload(progress, data: dict) -> dict:
    """Apply mark/status rules to an update/create payload."""
    validate_marks_write(progress, data)
    if "status" in data:
        data["status"] = validate_status_write(progress, data["status"], data)
    return data


async def ensure_progress_from_admitted_exam(db, exam) -> None:
    """Create or refresh progress when a student is admitted (idempotent)."""
    if not exam.admitted or not admitted_school_id_for_exam(exam):
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
        for key in ("school_id", "academic_year", "class_in_year", "track"):
            setattr(existing, key, fields[key])
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
