"""Run: cd backend && ./venv/bin/python -m pytest tests/test_admission_pipeline_validation.py -v"""
import pytest
from fastapi import HTTPException

from app.admission_pipeline_validation import (
    normalize_pipeline_stages,
    pipeline_field_visible,
    validate_school_type_for_exam_type,
    validate_student_exam_write,
)


def _base(**overrides):
    data = {
        "student_id": 1,
        "school_start_year": 2026,
        "admission_class": 5,
        "eligible": False,
        "applied": False,
        "admit_card": False,
        "appeared": False,
        "result_declared": False,
        "selected": False,
        "admitted": False,
        "exam_type_id": 1,
        "exam_category_id": 1,
    }
    data.update(overrides)
    return data


def test_pipeline_field_visible_applied_application_number():
    flags = normalize_pipeline_stages({"eligible": True, "applied": True})
    assert pipeline_field_visible(flags, "application_number") is True
    assert pipeline_field_visible(flags, "roll_number") is False


def test_pipeline_field_visible_result_declared_scores_not_school():
    flags = normalize_pipeline_stages(
        {
            "eligible": True,
            "applied": True,
            "admit_card": True,
            "appeared": True,
            "result_declared": True,
        }
    )
    assert pipeline_field_visible(flags, "school_type") is False
    assert pipeline_field_visible(flags, "school_name") is False
    assert pipeline_field_visible(flags, "scores") is True
    assert pipeline_field_visible(flags, "reason_not_admitted") is False


def test_pipeline_field_visible_selected_school_block():
    flags = normalize_pipeline_stages(
        {
            "eligible": True,
            "applied": True,
            "admit_card": True,
            "appeared": True,
            "result_declared": True,
            "selected": True,
        }
    )
    assert pipeline_field_visible(flags, "school_type") is True
    assert pipeline_field_visible(flags, "school_name") is True


def test_applied_stage_requires_application_number():
    with pytest.raises(HTTPException) as exc:
        validate_student_exam_write(
            _base(
                eligible=True,
                applied=True,
                application_number=None,
            ),
            is_create=True,
            subject_ids=[],
            scores_by_subject={},
        )
    assert exc.value.status_code == 422
    assert exc.value.detail == "Application number is required."


def test_result_declared_requires_scores_only():
    with pytest.raises(HTTPException) as exc:
        validate_student_exam_write(
            _base(
                eligible=True,
                applied=True,
                admit_card=True,
                appeared=True,
                result_declared=True,
                application_number="APP1",
                roll_number="R1",
                exam_center_id=1,
                school_type="",
                admitted_school_id=None,
            ),
            is_create=True,
            subject_ids=[10, 11],
            scores_by_subject={10: 80.0},
        )
    assert exc.value.status_code == 422
    assert "score" in exc.value.detail.lower()

    validate_student_exam_write(
        _base(
            eligible=True,
            applied=True,
            admit_card=True,
            appeared=True,
            result_declared=True,
            application_number="APP1",
            roll_number="R1",
            exam_center_id=1,
            school_type="",
            admitted_school_id=None,
        ),
        is_create=True,
        subject_ids=[10],
        scores_by_subject={10: 90.0},
    )


def test_selected_requires_school_name():
    with pytest.raises(HTTPException) as exc:
        validate_student_exam_write(
            _base(
                eligible=True,
                applied=True,
                admit_card=True,
                appeared=True,
                result_declared=True,
                selected=True,
                application_number="APP1",
                roll_number="R1",
                exam_center_id=1,
                school_type="GRS",
                admitted_school_id=None,
            ),
            is_create=True,
            subject_ids=[10],
            scores_by_subject={10: 90.0},
        )
    assert exc.value.detail == "School name is required."


def test_school_type_must_match_exam_type_linkage():
    flags_data = _base(
        eligible=True,
        applied=True,
        admit_card=True,
        appeared=True,
        result_declared=True,
        selected=True,
        application_number="APP1",
        roll_number="R1",
        exam_center_id=1,
        school_type="OTHER",
        admitted_school_id=1,
    )
    with pytest.raises(HTTPException) as exc:
        validate_school_type_for_exam_type(
            flags_data,
            allowed_school_type_names=frozenset({"GRS"}),
        )
    assert exc.value.status_code == 422
    assert "not allowed" in exc.value.detail.lower()

    validate_school_type_for_exam_type(
        flags_data,
        allowed_school_type_names=frozenset({"GRS", "OTHER"}),
    )
