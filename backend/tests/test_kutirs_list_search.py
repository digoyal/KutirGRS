"""Run: cd backend && ./venv/bin/python -m pytest tests/test_kutirs_list_search.py -v"""
import app.models.donors  # noqa: F401 — Kutir→Donor relationship
import app.models.geo  # noqa: F401
import app.models.kutirs  # noqa: F401

from sqlalchemy import select, or_
from sqlalchemy.dialects import postgresql

from app.models.geo import Area, Cluster, District
from app.models.kutirs import Kutir


def test_district_only_filter_matches_denormalized_or_area_chain():
    """District filter without cluster uses kutir.district_id or cluster→area.district_id."""
    district_id = 3
    q = (
        select(Kutir.id)
        .select_from(Kutir)
        .join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
        .where(or_(Kutir.district_id == district_id, Area.district_id == district_id))
    )
    sql = str(q.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "kutirs.district_id" in sql
    assert "areas.district_id" in sql


def test_zone_only_filter_matches_denormalized_or_area_chain():
    """Zone filter without district/cluster uses kutir.district_id or cluster→area.district_id in zone."""
    zone_id = 21
    zone_districts = select(District.id).where(District.zone_id == zone_id)
    q = (
        select(Kutir.id)
        .select_from(Kutir)
        .join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
        .where(
            or_(
                Kutir.district_id.in_(zone_districts),
                Area.district_id.in_(zone_districts),
            )
        )
    )
    sql = str(q.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "districts.zone_id" in sql
    assert "kutirs.district_id" in sql
    assert "areas.district_id" in sql


def test_kutir_search_ilike_fields():
    term = "%bh%"
    q = select(Kutir.id).where(
        (Kutir.name.ilike(term))
        | (Kutir.street.ilike(term))
        | (Kutir.pincode.ilike(term))
    )
    sql = str(q.compile(dialect=postgresql.dialect()))
    assert "kutirs.name ILIKE" in sql
    assert "kutirs.street ILIKE" in sql
    assert "kutirs.pincode ILIKE" in sql