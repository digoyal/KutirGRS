"""Run: cd backend && ./venv/bin/python -m pytest tests/test_area_import_uniqueness.py -v"""
from app.routers.import_data import _area_name_system_unique_violation


def test_no_existing_rows_ok():
    assert _area_name_system_unique_violation(
        name="North", target_district_id=1, matching_district_ids=[]
    ) is None


def test_single_row_same_district_ok():
    assert _area_name_system_unique_violation(
        name="North", target_district_id=5, matching_district_ids=[5]
    ) is None


def test_single_row_other_district_blocked():
    msg = _area_name_system_unique_violation(
        name="North", target_district_id=2, matching_district_ids=[7]
    )
    assert msg is not None
    assert "unique system-wide" in msg
    assert "11_Areas" in msg


def test_multiple_rows_blocked():
    msg = _area_name_system_unique_violation(
        name="North", target_district_id=2, matching_district_ids=[2, 7]
    )
    assert msg is not None
    assert "2 rows in DB" in msg