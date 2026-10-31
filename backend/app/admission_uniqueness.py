"""Admission (student_exam) uniqueness rules enforced on API create/update and import."""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.students import StudentExam


def format_academic_year(start_year: int) -> str:
    """Match frontend formatAcademicYear: 2025 → \"2025-26\"."""
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def admission_duplicate_detail(school_start_year: int) -> str:
    year = format_academic_year(school_start_year)
    return (
        f"Student already has a admission record in progress for academic year {year} "
        f"for the selected exam type and/or GRS school."
    )


def grs_school_id(
    school_id: Optional[int],
    admitted_school_id: Optional[int],
) -> Optional[int]:
    """GRS school: UI stores target school on admitted_school_id; import uses school_id."""
    if admitted_school_id is not None:
        return admitted_school_id
    return school_id


def _effective_grs_sql():
    """Same normalization as grs_school_id(), applied to persisted rows."""
    return func.coalesce(StudentExam.admitted_school_id, StudentExam.school_id)


async def admission_uniqueness_violation(
    db: AsyncSession,
    *,
    student_id: int,
    school_start_year: int,
    admitted: bool,
    exam_type_id: Optional[int],
    school_id: Optional[int],
    admitted_school_id: Optional[int],
    exclude_exam_id: Optional[int] = None,
) -> Optional[str]:
    """
    1. Admitted saves: at most one admitted record per student per school_start_year.
    2. No GRS school on save: at most one record per (student_id, school_start_year) among
       rows whose GRS school is also unset (coalesce admitted_school_id, school_id).
    3. With GRS school: at most one per (student_id, exam_type_id, GRS school) — exam_type_id
       uses NULL-safe equality (IS NOT DISTINCT FROM).
    """
    excl = exclude_exam_id

    if admitted:
        q = select(StudentExam.id).where(
            StudentExam.student_id == student_id,
            StudentExam.school_start_year == school_start_year,
            StudentExam.admitted.is_(True),
        )
        if excl is not None:
            q = q.where(StudentExam.id != excl)
        if (await db.execute(q.limit(1))).scalar_one_or_none() is not None:
            return admission_duplicate_detail(school_start_year)

    grs_id = grs_school_id(school_id, admitted_school_id)
    effective_grs = _effective_grs_sql()

    # Without a GRS school, keep a single in-progress admission per student per year
    # (avoids duplicate list rows from re-Add with a different exam type).
    if grs_id is None:
        q = select(StudentExam.id).where(
            StudentExam.student_id == student_id,
            StudentExam.school_start_year == school_start_year,
            effective_grs.is_(None),
        )
        if excl is not None:
            q = q.where(StudentExam.id != excl)
        if (await db.execute(q.limit(1))).scalar_one_or_none() is not None:
            return admission_duplicate_detail(school_start_year)
        return None

    q = select(StudentExam.id).where(
        StudentExam.student_id == student_id,
        StudentExam.exam_type_id.is_not_distinct_from(exam_type_id),
        effective_grs == grs_id,
    )

    if excl is not None:
        q = q.where(StudentExam.id != excl)
    if (await db.execute(q.limit(1))).scalar_one_or_none() is not None:
        return admission_duplicate_detail(school_start_year)
    return None


async def assert_admission_uniqueness(
    db: AsyncSession,
    *,
    student_id: int,
    school_start_year: int,
    admitted: bool,
    exam_type_id: Optional[int],
    school_id: Optional[int],
    admitted_school_id: Optional[int],
    exclude_exam_id: Optional[int] = None,
) -> None:
    msg = await admission_uniqueness_violation(
        db,
        student_id=student_id,
        school_start_year=school_start_year,
        admitted=admitted,
        exam_type_id=exam_type_id,
        school_id=school_id,
        admitted_school_id=admitted_school_id,
        exclude_exam_id=exclude_exam_id,
    )
    if msg:
        raise HTTPException(409, msg)
