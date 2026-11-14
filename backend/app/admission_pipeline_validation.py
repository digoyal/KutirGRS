"""Admission pipeline visibility and validate-on-write (mirrors admissions-pipeline.tsx)."""
from __future__ import annotations

from typing import Any, Literal, Mapping

from fastapi import HTTPException

STAGE_KEYS = (
    "eligible",
    "applied",
    "admit_card",
    "appeared",
    "result_declared",
    "selected",
    "admitted",
)

STAGE_INDEX: dict[str, int] = {k: i for i, k in enumerate(STAGE_KEYS)}

PIPELINE_STAGE_FILTERS = STAGE_KEYS


def parse_pipeline_stage_filter(value: str) -> str:
    key = value.strip().lower()
    if key not in PIPELINE_STAGE_FILTERS:
        allowed = ", ".join(PIPELINE_STAGE_FILTERS)
        raise HTTPException(422, detail=f"Invalid pipeline_stage {value!r}; use one of: {allowed}")
    return key


def pipeline_stage_matches(flags: Mapping[str, bool], filter_stage: str) -> bool:
    """Same semantics as list filter: current furthest-true stage must equal filter."""
    return pipeline_stage(flags) == STAGE_INDEX[filter_stage]

PipelineField = Literal[
    "year",
    "exam_type",
    "exam_category",
    "parivaar_district",
    "exam_center",
    "application_number",
    "roll_number",
    "reason_not_appeared",
    "scores",
    "school_district",
    "school_type",
    "school_name",
    "reason_not_admitted",
]

FieldRule = tuple[Literal["min", "only"], str]

PIPELINE_FIELD_RULES: dict[PipelineField, FieldRule] = {
    "year": ("min", "eligible"),
    "exam_type": ("min", "eligible"),
    "exam_category": ("min", "eligible"),
    "parivaar_district": ("min", "admit_card"),
    "exam_center": ("min", "admit_card"),
    "application_number": ("min", "applied"),
    "roll_number": ("min", "admit_card"),
    "reason_not_appeared": ("only", "admit_card"),
    "scores": ("min", "result_declared"),
    "school_district": ("min", "selected"),
    "school_type": ("min", "selected"),
    "school_name": ("min", "selected"),
    "reason_not_admitted": ("only", "selected"),
}


def _stage_flags(data: Mapping[str, Any]) -> dict[str, bool]:
    return {k: bool(data.get(k)) for k in STAGE_KEYS}


def pipeline_stage(flags: Mapping[str, bool]) -> int:
    for i in range(len(STAGE_KEYS) - 1, -1, -1):
        if flags.get(STAGE_KEYS[i]):
            return i
    return -1


def normalize_pipeline_stages(flags: Mapping[str, bool]) -> dict[str, bool]:
    max_i = -1
    for i, key in enumerate(STAGE_KEYS):
        if flags.get(key):
            max_i = i
    return {key: i <= max_i for i, key in enumerate(STAGE_KEYS)}


def pipeline_field_visible(flags: Mapping[str, bool], field: PipelineField) -> bool:
    rule_kind, rule_stage = PIPELINE_FIELD_RULES[field]
    normalized = normalize_pipeline_stages(flags)
    idx = pipeline_stage(normalized)
    if idx < 0:
        return False
    if rule_kind == "min":
        return idx >= STAGE_INDEX[rule_stage]
    return idx == STAGE_INDEX[rule_stage]


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def student_exam_merged_for_update(existing: Any, update: Mapping[str, Any]) -> dict[str, Any]:
    """Merge PATCH onto a StudentExam row for validate-on-write."""
    merged: dict[str, Any] = {
        "student_id": existing.student_id,
        "school_start_year": existing.school_start_year,
        "school_type": existing.school_type,
        "exam_type_id": existing.exam_type_id,
        "exam_category_id": existing.exam_category_id,
        "exam_center_id": existing.exam_center_id,
        "application_number": existing.application_number,
        "roll_number": existing.roll_number,
        "admitted_school_id": existing.admitted_school_id,
        "no_exam_reason_id": existing.no_exam_reason_id,
        "no_admit_reason_id": existing.no_admit_reason_id,
        "admission_class": existing.admission_class,
    }
    for key in STAGE_KEYS:
        merged[key] = getattr(existing, key)
    for key, value in update.items():
        if key in merged or key in STAGE_KEYS:
            merged[key] = value
    return merged


def validate_student_exam_write(
    data: Mapping[str, Any],
    *,
    is_create: bool,
    subject_ids: list[int] | None = None,
    scores_by_subject: Mapping[int, Any] | None = None,
) -> None:
    """Raise HTTP 422 with a single plain detail when a visible field is missing."""
    flags = normalize_pipeline_stages(_stage_flags(data))
    show = lambda field: pipeline_field_visible(flags, field)  # noqa: E731
    # Bulk Apply and similar sparse creates: Eligible stage only, details before Applied.
    stage_idx = pipeline_stage(flags)
    if stage_idx < 0:
        raise HTTPException(
            422,
            "Pipeline stage is required (select at least Eligible).",
        )
    sparse_eligible_create = is_create and stage_idx == 0 and not flags.get("applied")

    if is_create and not data.get("student_id"):
        raise HTTPException(422, "Select a student.")

    admission_class = data.get("admission_class")
    if admission_class not in (5, 8):
        raise HTTPException(422, "Class is required (select 5 or 8).")

    if show("year"):
        year = data.get("school_start_year")
        if year is None or (isinstance(year, int) and year <= 0):
            raise HTTPException(422, "Year is required.")

    if show("exam_type") and not data.get("exam_type_id") and not sparse_eligible_create:
        raise HTTPException(422, "Exam type is required.")

    if show("exam_category") and not data.get("exam_category_id") and not sparse_eligible_create:
        raise HTTPException(422, "Exam category is required.")

    if show("exam_center") and not data.get("exam_center_id"):
        raise HTTPException(422, "Exam center is required.")

    if show("application_number") and _is_blank(data.get("application_number")):
        raise HTTPException(422, "Application number is required.")

    if show("roll_number") and _is_blank(data.get("roll_number")):
        raise HTTPException(422, "Roll number is required.")

    if show("reason_not_appeared") and not data.get("no_exam_reason_id"):
        raise HTTPException(422, "Reason not appeared is required.")

    if show("scores"):
        ids = subject_ids or []
        if not ids:
            if not data.get("exam_type_id"):
                raise HTTPException(422, "Exam type is required.")
            raise HTTPException(
                422,
                "This exam type has no subjects configured; add subjects before entering scores.",
            )
        scores_by_subject = scores_by_subject or {}
        for sid in ids:
            score = scores_by_subject.get(sid)
            if score is None or (isinstance(score, str) and not score.strip()):
                raise HTTPException(422, "Enter a score for every subject.")

    if show("school_type") and _is_blank(data.get("school_type")):
        raise HTTPException(422, "School type is required.")

    if show("school_name") and not data.get("admitted_school_id"):
        raise HTTPException(422, "School name is required.")

    if show("reason_not_admitted") and not data.get("no_admit_reason_id"):
        raise HTTPException(422, "Reason not admitted is required.")


def validate_school_type_for_exam_type(
    data: Mapping[str, Any],
    *,
    allowed_school_type_names: frozenset[str],
) -> None:
    """When school type is visible and set, it must be linked to the selected exam type."""
    flags = normalize_pipeline_stages(_stage_flags(data))
    if not pipeline_field_visible(flags, "school_type"):
        return
    school_type = data.get("school_type")
    if _is_blank(school_type):
        return
    exam_type_id = data.get("exam_type_id")
    if not exam_type_id:
        return
    name = school_type.strip() if isinstance(school_type, str) else str(school_type)
    if not allowed_school_type_names:
        raise HTTPException(422, "This exam type has no school types configured.")
    if name not in allowed_school_type_names:
        raise HTTPException(422, "School type is not allowed for the selected exam type.")
