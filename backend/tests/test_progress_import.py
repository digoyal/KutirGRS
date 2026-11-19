"""Run: cd backend && ./venv/bin/python -m pytest tests/test_progress_import.py -v"""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import openpyxl
import pytest

from app.routers.import_data import _import_progress


REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "GRS_Import_Template.xlsx"

LEGACY_PROGRESS_COLS = frozenset(
    {"transfer_school", "previous_year_percentage", "previous_year_marks"}
)


def test_progress_template_sheet_omits_legacy_columns():
    wb = openpyxl.load_workbook(TEMPLATE, read_only=True)
    try:
        headers = [c for c in next(wb["20_Progress"].iter_rows(max_row=1, values_only=True)) if c]
    finally:
        wb.close()
    assert LEGACY_PROGRESS_COLS.isdisjoint(set(headers))
    assert "marks_6" in headers and "marks_12" in headers


def _scalar_result(rows):
    return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: rows))


def _one_result(row):
    return SimpleNamespace(one_or_none=lambda: row)


def _scalar_one(val):
    return SimpleNamespace(scalar_one=lambda: val)


@pytest.mark.asyncio
async def test_import_progress_ignores_legacy_columns_uses_marks():
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _scalar_result([10]),  # student id
            _scalar_result([5]),  # school id
            _one_result(("EMRS", 1)),  # school meta
            _scalar_result([]),  # no existing progress
            _scalar_one(100),  # insert returning id
        ]
    )
    db.get = AsyncMock(return_value=None)

    row = {
        "first_name": "Ravi",
        "last_name": "Sharma",
        "kutir_name": "K1",
        "cluster_name": "C1",
        "district_name": "D1",
        "school_name": "EMRS",
        "academic_year": 2025,
        "class_in_year": 6,
        "status": "enrolled",
        "track": "six_twelve",
        "marks_6": 77.0,
        "transfer_school": "Legacy School",
        "previous_year_percentage": 99.0,
        "previous_year_marks": 88.0,
    }

    with patch(
        "app.routers.import_data._resolve_kutir_id",
        new_callable=AsyncMock,
        return_value=(1, None),
    ):
        result = await _import_progress([row], db)

    assert result["created"] == 1
    assert result["errors"] == []
    insert_call = db.execute.call_args_list[-1]
    params = insert_call[0][1]
    assert params["m6"] == 77.0
    assert "transfer_school" not in insert_call[0][0].text