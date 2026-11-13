import pytest
from fastapi import HTTPException

from app.student_validation import validate_student_write


def _valid_payload(**overrides):
    base = {
        "kutir_id": 1,
        "first_name": "A",
        "last_name": "B",
        "gender": "Boy",
        "dob": "2010-01-01",
        "phone": "9999999999",
        "category_id": 1,
        "father_name": "Father",
        "mother_name": "Mother",
    }
    base.update(overrides)
    return base


def test_validate_student_write_ok():
    validate_student_write(_valid_payload())


def test_validate_student_write_missing_fields():
    with pytest.raises(HTTPException) as exc:
        validate_student_write(_valid_payload(phone="", dob=None))
    assert exc.value.status_code == 422
    assert "Required:" in exc.value.detail
