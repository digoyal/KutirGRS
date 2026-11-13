"""Run: cd backend && ./venv/bin/python -m pytest tests/test_student_delete.py -v"""
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

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

from app.database import AsyncSessionLocal, engine
from app.models.kutirs import Kutir
from app.models.lookups import Category
from app.models.students import Student, StudentExam
from app.routers.students import _STUDENT_DELETE_BLOCKED_MSG, delete_student


async def _student_with_exams(db) -> int:
    row = await db.execute(select(StudentExam.student_id).limit(1))
    student_id = row.scalar_one_or_none()
    if student_id is None:
        pytest.skip("No student_exams rows in database")
    return student_id


async def _create_student_without_exams(db) -> int:
    kutir_id = (await db.execute(select(Kutir.id).limit(1))).scalar_one_or_none()
    category_id = (await db.execute(select(Category.id).limit(1))).scalar_one_or_none()
    if kutir_id is None or category_id is None:
        pytest.skip("Need at least one kutir and category to create a test student")
    student = Student(
        kutir_id=kutir_id,
        first_name="Delete",
        last_name="Test",
        gender="Boy",
        dob=date(2010, 1, 1),
        phone="9999999999",
        father_name="Test Father",
        mother_name="Test Mother",
        category_id=category_id,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student.id


@pytest.mark.asyncio
async def test_delete_student_requires_no_admissions():
    async with AsyncSessionLocal() as db:
        blocked_id = await _student_with_exams(db)
        before = await db.execute(
            select(func.count()).select_from(Student).where(Student.id == blocked_id)
        )
        assert before.scalar_one() == 1
        with pytest.raises(HTTPException) as exc:
            await delete_student(blocked_id, db, scope=None)
        assert exc.value.status_code == 409
        assert exc.value.detail == _STUDENT_DELETE_BLOCKED_MSG
        still = await db.execute(
            select(func.count()).select_from(Student).where(Student.id == blocked_id)
        )
        assert still.scalar_one() == 1

        student_id = await _create_student_without_exams(db)
        await delete_student(student_id, db, scope=None)
        after = await db.execute(
            select(func.count()).select_from(Student).where(Student.id == student_id)
        )
        assert after.scalar_one() == 0

    await engine.dispose()
