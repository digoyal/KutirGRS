"""Run: cd backend && ./venv/bin/python -m pytest tests/test_students_import_template.py -v"""
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "GRS_Import_Template.xlsx"

LEGACY_STUDENT_ADDR_COLS = frozenset({"street", "pincode"})


def test_students_template_sheet_omits_street_pincode():
    wb = openpyxl.load_workbook(TEMPLATE, read_only=True)
    try:
        headers = [
            c for c in next(wb["18_Students"].iter_rows(max_row=1, values_only=True)) if c
        ]
    finally:
        wb.close()
    assert LEGACY_STUDENT_ADDR_COLS.isdisjoint(set(headers))
    assert "exam_year" in headers
    assert "kutir_name" in headers and "district_name" in headers