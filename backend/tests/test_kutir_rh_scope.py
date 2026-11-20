"""Run: cd backend && ./venv/bin/python -m pytest tests/test_kutir_rh_scope.py -v"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql

import app.models.donors  # noqa: F401
import app.models.geo  # noqa: F401
import app.models.kutirs  # noqa: F401

from app.auth import get_user_kutir_scope, kutir_ids_in_districts_select


def test_kutir_ids_in_districts_select_matches_list_filter_shape():
    district_ids = [3, 7]
    q = kutir_ids_in_districts_select(district_ids)
    sql = str(q.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "kutirs.district_id" in sql
    assert "areas.district_id" in sql
    assert "clusters" in sql


def _mock_db_for_scope(execute_results):
    """execute_results: list of row tuples per call."""
    calls = {"n": 0}

    async def _execute(stmt):
        idx = calls["n"]
        calls["n"] += 1
        rows = execute_results[idx] if idx < len(execute_results) else []
        return SimpleNamespace(all=lambda: rows)

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=_execute)
    return db


@pytest.mark.asyncio
async def test_regional_head_scope_includes_kutir_without_denormalized_district():
    user = SimpleNamespace(title="Regional Head", id=2, is_superuser=False)
    db = _mock_db_for_scope(
        [
            [(10,)],  # user_zones
            [(3,), (4,)],  # districts in zone
            [(101,), (102,)],  # kutir ids via district scope query
        ]
    )
    scope = await get_user_kutir_scope(user, db)
    assert scope == {101, 102}
    stmt = db.execute.call_args_list[2][0][0]
    sql = str(stmt.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "areas.district_id" in sql


@pytest.mark.asyncio
async def test_district_anchor_scope_uses_cluster_chain():
    user = SimpleNamespace(title="District Anchor", id=5, is_superuser=False)
    db = _mock_db_for_scope(
        [
            [(3,)],  # user_districts
            [(55,)],  # kutir ids
        ]
    )
    scope = await get_user_kutir_scope(user, db)
    assert scope == {55}
    stmt = db.execute.call_args_list[1][0][0]
    sql = str(stmt.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "kutirs.district_id" in sql
    assert "areas.district_id" in sql