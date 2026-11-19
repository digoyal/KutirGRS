"""District CUD: zone_id must fall in caller geo scope when zone_ids is set."""
import pytest
from fastapi import HTTPException

from app.auth import GeoScope, require_zone_in_geo_scope


def test_create_district_zone_denied_outside_assigned_zones():
    gs = GeoScope(zone_ids={10, 20})
    with pytest.raises(HTTPException) as exc:
        require_zone_in_geo_scope(99, gs, detail="Not found")
    assert exc.value.status_code == 404
    assert exc.value.detail == "Not found"


def test_create_district_zone_allowed_inside_assigned_zones():
    gs = GeoScope(zone_ids={10, 20})
    require_zone_in_geo_scope(10, gs, detail="Not found")
    require_zone_in_geo_scope(20, gs, detail="Not found")