"""Run: cd backend && ./venv/bin/python -m pytest tests/test_kutir_import_cluster_resolve.py -v"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.routers.import_data import (
    _resolve_cluster_id,
    _resolve_kutir_id,
)


def _mock_db(scalar_rows):
    result = SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: scalar_rows))
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    return db


@pytest.mark.asyncio
async def test_resolve_cluster_district_scope_single_match():
    db = _mock_db([42])
    cid, err = await _resolve_cluster_id(
        db, cluster_name="Alpha", district_name="Dewas",
    )
    assert err is None
    assert cid == 42
    sql = db.execute.call_args[0][0].text
    assert "lower(d.name)" in sql
    assert "lower(:a)" not in sql


@pytest.mark.asyncio
async def test_resolve_cluster_district_scope_none_found():
    db = _mock_db([])
    _cid, err = await _resolve_cluster_id(
        db, cluster_name="Alpha", district_name="Dewas",
    )
    assert err == "Cluster 'Alpha' not found in district 'Dewas'"


@pytest.mark.asyncio
async def test_resolve_cluster_district_scope_ambiguous():
    db = _mock_db([1, 2])
    _cid, err = await _resolve_cluster_id(
        db, cluster_name="Alpha", district_name="Dewas",
    )
    assert err is not None
    assert "duplicate cluster name in district" in err
    assert "area_name" not in err


@pytest.mark.asyncio
async def test_resolve_kutir_district_cluster_scope_single_match():
    db = _mock_db([99])
    kid, err = await _resolve_kutir_id(
        db,
        kutir_name="K1",
        cluster_name="Alpha",
        district_name="Dewas",
    )
    assert err is None
    assert kid == 99
    sql = db.execute.call_args[0][0].text
    assert "lower(c.name)" in sql
    assert "lower(d.name)" in sql
    assert "lower(a.name)" not in sql


@pytest.mark.asyncio
async def test_resolve_kutir_district_cluster_scope_ambiguous():
    db = _mock_db([1, 2])
    _kid, err = await _resolve_kutir_id(
        db,
        kutir_name="K1",
        cluster_name="Alpha",
        district_name="Dewas",
    )
    assert err is not None
    assert "duplicate kutir name in cluster" in err
    assert "area_name" not in err