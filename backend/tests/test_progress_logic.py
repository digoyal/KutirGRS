"""Unit tests for progress class/year advancement."""
from decimal import Decimal
from types import SimpleNamespace

from app.progress_logic import (
    initial_progress_fields_from_exam,
    recompute_class_in_year_from_marks,
    sync_class_year_from_marks,
    snapshot_marks,
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
    assert p.academic_year == 2033
    assert p.class_in_year == 12


def test_recompute_class_in_year_from_marks():
    p = _progress(marks_6=Decimal("1"), marks_7=Decimal("2"))
    recompute_class_in_year_from_marks(p)
    assert p.class_in_year == 8
