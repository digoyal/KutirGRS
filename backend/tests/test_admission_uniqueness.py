"""Run: cd backend && ./venv/bin/python -m pytest tests/test_admission_uniqueness.py -v"""
import pytest
from sqlalchemy import select

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
)
from app.database import AsyncSessionLocal, engine
from app.models.students import StudentExam


def test_format_academic_year_matches_ui():
    assert format_academic_year(2025) == "2025-26"
    assert admission_duplicate_detail(2026) == (
        "Student already has a admission record in progress for academic year 2026-27 "
        "for the selected class and exam type."
    )


async def _sample_exam(db):
    """Pick any existing exam row so tests do not depend on fixed seed IDs."""
    return (
        await db.execute(select(StudentExam).order_by(StudentExam.id).limit(1))
    ).scalar_one_or_none()


@pytest.mark.asyncio
async def test_uniqueness_quartet_integration():
    """One session: quartet blocks duplicate; class and exam type differentiate rows."""
    async with AsyncSessionLocal() as db:
        row = await _sample_exam(db)
        if row is None:
            pytest.skip("No student_exams in database")

        msg = await admission_uniqueness_violation(
            db,
            student_id=row.student_id,
            school_start_year=row.school_start_year,
            admitted=False,
            exam_type_id=row.exam_type_id,
            admission_class=row.admission_class,
            exclude_exam_id=row.id,
        )
        assert msg is None

        msg = await admission_uniqueness_violation(
            db,
            student_id=row.student_id,
            school_start_year=row.school_start_year,
            admitted=False,
            exam_type_id=row.exam_type_id,
            admission_class=row.admission_class,
            exclude_exam_id=-1,
        )
        assert msg == admission_duplicate_detail(row.school_start_year)

        other_type = 99_999 if row.exam_type_id != 99_999 else 99_998
        msg = await admission_uniqueness_violation(
            db,
            student_id=row.student_id,
            school_start_year=row.school_start_year,
            admitted=False,
            exam_type_id=other_type,
            admission_class=row.admission_class,
            exclude_exam_id=-1,
        )
        assert msg is None

        alt_class = 8 if row.admission_class != 8 else 5
        if row.admission_class == alt_class:
            alt_class = 5 if alt_class == 8 else 8
        msg = await admission_uniqueness_violation(
            db,
            student_id=row.student_id,
            school_start_year=row.school_start_year,
            admitted=False,
            exam_type_id=row.exam_type_id,
            admission_class=alt_class,
            exclude_exam_id=-1,
        )
        assert msg is None

    await engine.dispose()
