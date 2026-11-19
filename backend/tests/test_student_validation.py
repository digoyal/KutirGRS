import pytest
from fastapi import HTTPException

from app.student_validation import (
    normalize_indian_mobile,
    normalize_student_phones,
    validate_student_write,
)


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


def test_validate_student_write_without_last_name():
    validate_student_write(_valid_payload(last_name=None))
    validate_student_write(_valid_payload(last_name=""))


def test_validate_student_write_missing_fields():
    with pytest.raises(HTTPException) as exc:
        validate_student_write(_valid_payload(phone="", dob=None))
    assert exc.value.status_code == 422
    assert "Required:" in exc.value.detail


def test_validate_student_write_rejects_short_phone():
    with pytest.raises(HTTPException) as exc:
        validate_student_write(_valid_payload(phone="334"))
    assert exc.value.status_code == 422
    assert exc.value.detail == "Phone must be exactly 10 digits"


def test_validate_student_write_accepts_normalized_spacing():
    validate_student_write(_valid_payload(phone="98765 43210"))


def test_validate_student_write_rejects_invalid_alt_phone():
    with pytest.raises(HTTPException) as exc:
        validate_student_write(_valid_payload(alt_contact_phone="123"))
    assert exc.value.status_code == 422
    assert exc.value.detail == "Alt phone must be exactly 10 digits"


def test_normalize_indian_mobile_valid():
    assert normalize_indian_mobile("9876543210") == ("9876543210", None)
    assert normalize_indian_mobile("98765-43210") == ("9876543210", None)
    assert normalize_indian_mobile("+919876543210") == ("9876543210", None)
    assert normalize_indian_mobile("334")[1] == "Phone must be exactly 10 digits"
    assert normalize_indian_mobile(None, required=False) == (None, None)


def test_normalize_student_phones_stores_digits():
    data = _valid_payload(phone="98765 43210", alt_contact_phone="")
    normalize_student_phones(data)
    assert data["phone"] == "9876543210"
    assert data["alt_contact_phone"] is None
