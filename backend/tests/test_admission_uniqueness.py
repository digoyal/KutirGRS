"""Run: cd backend && ./venv/bin/python -m pytest tests/test_admission_uniqueness.py -v"""
import pytest

import app.models.lookups  # noqa: F401 — ORM registry
import app.models.geo  # noqa: F401
import app.models.donors  # noqa: F401
import app.models.schools  # noqa: F401
import app.models.users  # noqa: F401
import app.models.password_reset  # noqa: F401
import app.models.kutirs  # noqa: F401
import app.models.students  # noqa: F401
import app.models.visits  # noqa: F401
import app.models.settings  # noqa: F401

from app.admission_uniqueness import (
    admission_duplicate_detail,
    admission_uniqueness_violation,
    format_academic_year,
    grs_school_id,
)
from app.database import AsyncSessionLocal


def test_grs_school_id_prefers_admitted_school():
    assert grs_school_id(1, 2) == 2
    assert grs_school_id(1, None) == 1
    assert grs_school_id(None, None) is None


def test_format_academic_year_matches_ui():
    assert format_academic_year(2025) == "2025-26"
    assert admission_duplicate_detail(2026) == (
        "Student already has a admission record in progress for academic year 2026-27 "
        "for the selected exam type and/or GRS school."
    )


@pytest.mark.asyncio
async def test_blocks_duplicate_null_exam_type_same_grs_school():
    """Reproduces seeded dupes: exam_type_id NULL, school_id set, guard must fire."""
    async with AsyncSessionLocal() as db:
        msg = await admission_uniqueness_violation(
            db,
            student_id=28,
            school_start_year=2027,
            admitted=False,
            exam_type_id=None,
            school_id=1,
            admitted_school_id=None,
            exclude_exam_id=-1,
        )
        assert msg == admission_duplicate_detail(2027)


@pytest.mark.asyncio
async def test_blocks_same_exam_type_split_grs_columns():
    """UI row (admitted_school_id) vs import row (school_id) for same physical school."""
    async with AsyncSessionLocal() as db:
        msg = await admission_uniqueness_violation(
            db,
            student_id=28,
            school_start_year=2027,
            admitted=False,
            exam_type_id=3,
            school_id=None,
            admitted_school_id=1,
            exclude_exam_id=45,
        )
        assert msg == admission_duplicate_detail(2027)


@pytest.mark.asyncio
async def test_blocks_second_null_grs_same_year_different_exam_type():
    """Reproduces Aman (student 310): two Add rows with no GRS school, different exam types."""
    async with AsyncSessionLocal() as db:
        msg = await admission_uniqueness_violation(
            db,
            student_id=310,
            school_start_year=2026,
            admitted=False,
            exam_type_id=1,
            school_id=None,
            admitted_school_id=None,
            exclude_exam_id=-1,
        )
        assert msg == admission_duplicate_detail(2026)


@pytest.mark.asyncio
async def test_allows_different_exam_type_same_grs():
    async with AsyncSessionLocal() as db:
        msg = await admission_uniqueness_violation(
            db,
            student_id=28,
            school_start_year=2027,
            admitted=False,
            exam_type_id=99,
            school_id=1,
            admitted_school_id=None,
            exclude_exam_id=45,
        )
        assert msg is None
