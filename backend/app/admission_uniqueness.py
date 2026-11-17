"""Admission (student_exam) uniqueness rules enforced on API create/update and import.

In-progress (and overlapping) saves: at most one row per
(student_id, school_start_year, admission_class, exam_type_id).
``exam_type_id`` and ``admission_class`` use NULL-safe equality (IS NOT DISTINCT FROM).

Admitted saves: at most one *admitted* row per student per school_start_year (unchanged).
"""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.students import StudentExam


def format_academic_year(start_year: int) -> str:
    """Match frontend formatAcademicYear: 2025 → \"2025-26\"."""
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def admission_duplicate_detail(school_start_year: int) -> str:
    year = format_academic_year(school_start_year)
    return (
        f"Student already has a admission record in progress for academic year {year} "
        f"for the selected class and exam type."
    )


async def admission_uniqueness_violation(
    db: AsyncSession,
    *,
    student_id: int,
    school_start_year: int,
    admitted: bool,
    exam_type_id: Optional[int],
    admission_class: Optional[int],
    exclude_exam_id: Optional[int] = None,
) -> Optional[str]:
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

    q = select(StudentExam.id).where(
        StudentExam.student_id == student_id,
        StudentExam.school_start_year == school_start_year,
        StudentExam.admission_class.is_not_distinct_from(admission_class),
        StudentExam.exam_type_id.is_not_distinct_from(exam_type_id),
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
    admission_class: Optional[int],
    exclude_exam_id: Optional[int] = None,
) -> None:
    msg = await admission_uniqueness_violation(
        db,
        student_id=student_id,
        school_start_year=school_start_year,
        admitted=admitted,
        exam_type_id=exam_type_id,
        admission_class=admission_class,
        exclude_exam_id=exclude_exam_id,
    )
    if msg:
        raise HTTPException(409, msg)