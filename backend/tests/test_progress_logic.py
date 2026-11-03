"""Unit tests for progress class/year advancement."""
from decimal import Decimal
from types import SimpleNamespace

from fastapi import HTTPException
import pytest

from app.progress_logic import (
    apply_graduated_status,
    enabled_mark_classes,
    initial_progress_fields_from_exam,
    recompute_class_in_year_from_marks,
    sync_class_year_from_marks,
    snapshot_marks,
    validate_marks_write,
    validate_status_write,
    TRACK_NINE_TWELVE,
    TRACK_SIX_TWELVE,
)


def _progress(**kwargs):
    defaults = {
        "track": TRACK_SIX_TWELVE,
        "academic_year": 2026,
        "class_in_year": 6,
        "status": "enrolled",
        "marks_6": None,
        "marks_7": None,
        "marks_8": None,
        "marks_9": None,
        "marks_10": None,
        "marks_11": None,
        "marks_12": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_initial_progress_fields_from_exam():
    exam = SimpleNamespace(
        student_id=1,
        admitted_school_id=10,
        school_start_year=2025,
        admission_class=5,
    )
    fields = initial_progress_fields_from_exam(exam)
    assert fields["academic_year"] == 2026
    assert fields["class_in_year"] == 6
    assert fields["track"] == TRACK_SIX_TWELVE


def test_sync_class_year_on_first_mark():
    p = _progress()
    before = snapshot_marks(p)
    p.marks_6 = Decimal("72.5")
    sync_class_year_from_marks(p, before)
    assert p.academic_year == 2027
    assert p.class_in_year == 7


def test_sync_class_year_no_op_on_resave():
    p = _progress(academic_year=2027, class_in_year=7, marks_6=Decimal("72.5"))
    before = snapshot_marks(p)
    p.marks_6 = Decimal("80")
    sync_class_year_from_marks(p, before)
    assert p.academic_year == 2027
    assert p.class_in_year == 7


def test_sync_class_year_final_class():
    p = _progress(
        academic_year=2032,
        class_in_year=12,
        marks_6=Decimal("70"),
        marks_7=Decimal("71"),
        marks_8=Decimal("72"),
        marks_9=Decimal("73"),
        marks_10=Decimal("74"),
        marks_11=Decimal("75"),
    )
    before = snapshot_marks(p)
    p.marks_12 = Decimal("76")
    sync_class_year_from_marks(p, before)
    assert p.academic_year == 2032
    assert p.class_in_year == 12


def test_recompute_class_in_year_from_marks():
    p = _progress(marks_6=Decimal("1"), marks_7=Decimal("2"))
    recompute_class_in_year_from_marks(p)
    assert p.class_in_year == 8


def test_enabled_mark_classes_only_current_class():
    p = _progress(class_in_year=6)
    assert enabled_mark_classes(p) == [6]
    p = _progress(class_in_year=7, marks_6=Decimal("70"))
    assert enabled_mark_classes(p) == [7]


def test_validate_marks_write_allows_current_only():
    p = _progress(class_in_year=7, marks_6=Decimal("70"))
    validate_marks_write(p, {"marks_6": Decimal("70"), "marks_7": Decimal("80")})
    with pytest.raises(HTTPException):
        validate_marks_write(p, {"marks_6": Decimal("71")})


def test_apply_graduated_status_on_marks_12():
    p = _progress(class_in_year=12, status="promoted")
    p.marks_12 = Decimal("88")
    apply_graduated_status(p)
    assert p.status == "graduated"


def test_apply_graduated_status_respects_admitted_to_college():
    p = _progress(class_in_year=12, status="admitted_to_college", marks_12=Decimal("88"))
    apply_graduated_status(p)
    assert p.status == "admitted_to_college"


def test_apply_graduated_status_respects_dropped_out():
    p = _progress(class_in_year=12, status="dropped_out", marks_12=Decimal("88"))
    apply_graduated_status(p)
    assert p.status == "dropped_out"


def test_enabled_mark_classes_empty_when_graduated_or_marks_12():
    p = _progress(class_in_year=12, status="graduated", marks_12=Decimal("90"))
    assert enabled_mark_classes(p) == []
    p = _progress(class_in_year=12, status="promoted", marks_12=Decimal("90"))
    assert enabled_mark_classes(p) == []


def test_validate_marks_write_locked_after_marks_12():
    p = _progress(
        class_in_year=12,
        status="graduated",
        marks_12=Decimal("90"),
    )
    with pytest.raises(HTTPException):
        validate_marks_write(p, {"marks_12": Decimal("91")})


def test_validate_status_write_after_marks_12_allows_terminal():
    p = _progress(class_in_year=12, status="graduated", marks_12=Decimal("88"))
    assert validate_status_write(p, "admitted_to_college") == "admitted_to_college"
    assert validate_status_write(p, "graduated") == "graduated"


def test_validate_status_write_after_marks_12_rejects_enrolled():
    p = _progress(class_in_year=12, status="graduated", marks_12=Decimal("88"))
    with pytest.raises(HTTPException):
        validate_status_write(p, "enrolled")


def test_validate_status_write_after_marks_12_allows_unchanged_legacy():
    p = _progress(class_in_year=12, status="dropped_out", marks_12=Decimal("88"))
    assert validate_status_write(p, "dropped_out") == "dropped_out"


def test_validate_status_write_marks_12_in_same_payload():
    p = _progress(class_in_year=12, status="promoted")
    assert (
        validate_status_write(p, "admitted_to_college", {"marks_12": Decimal("90")})
        == "admitted_to_college"
    )
    with pytest.raises(HTTPException):
        validate_status_write(p, "enrolled", {"marks_12": Decimal("90")})


def test_graduation_nine_twelve_track():
    p = _progress(
        track=TRACK_NINE_TWELVE,
        class_in_year=12,
        status="promoted",
        marks_9=Decimal("80"),
        marks_10=Decimal("81"),
        marks_11=Decimal("82"),
    )
    before = snapshot_marks(p)
    p.marks_12 = Decimal("83")
    sync_class_year_from_marks(p, before)
    assert p.academic_year == 2026
    assert p.class_in_year == 12
    apply_graduated_status(p)
    assert p.status == "graduated"
    assert enabled_mark_classes(p) == []
