"""Run: cd backend && ./venv/bin/python -m pytest tests/test_student_last_name_optional.py -v"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.routers.import_data import _import_students
from app.schemas.students import StudentCreate
from app.student_validation import validate_student_write


def test_student_create_schema_blank_last_name_none():
    created = StudentCreate(
        kutir_id=1,
        first_name="Only",
        last_name="",
        gender="Boy",
    )
    assert created.last_name is None

    created2 = StudentCreate.model_validate(
        {
            "kutir_id": 1,
            "first_name": "Only",
            "gender": "Boy",
        }
    )
    assert created2.last_name is None


def test_validate_write_accepts_missing_last_name():
    validate_student_write(
        {
            "kutir_id": 1,
            "first_name": "Only",
            "last_name": None,
            "gender": "Boy",
            "dob": "2010-01-01",
            "phone": "9999999999",
            "category_id": 1,
            "father_name": "Father",
            "mother_name": "Mother",
        }
    )


@pytest.mark.asyncio
async def test_import_students_inserts_null_last_name():
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [])),  # no match
            SimpleNamespace(),  # insert
        ]
    )

    row = {
        "first_name": "Ravi",
        "last_name": "",
        "kutir_name": "K1",
        "cluster_name": "C1",
        "district_name": "D1",
        "gender": "Boy",
    }

    with patch(
        "app.routers.import_data._resolve_kutir_id",
        new_callable=AsyncMock,
        return_value=(1, None),
    ):
        result = await _import_students([row], db)

    assert result["created"] == 1
    assert result["errors"] == []
    insert_call = db.execute.call_args_list[-1]
    params = insert_call[0][1]
    assert params["ln"] is None
    match_sql = db.execute.call_args_list[0][0][0].text
    assert "coalesce(lower(last_name)" in match_sql