from unittest.mock import AsyncMock, patch

import pytest

from app.geo_nominatim import geocode_village_district_state


@pytest.mark.asyncio
async def test_geocode_parses_hit():
    hits = [
        {
            "lat": "23.259933",
            "lon": "77.412614",
            "importance": 0.5,
            "display_name": "Bhopal, Madhya Pradesh, India",
            "address": {"country_code": "in"},
        }
    ]

    async def _fake_to_thread(fn, *args):
        return fn(*args)

    with (
        patch("app.geo_nominatim._rate_limit", new=AsyncMock()),
        patch("app.geo_nominatim.asyncio.to_thread", side_effect=_fake_to_thread),
        patch("app.geo_nominatim._fetch_search", return_value=hits),
    ):
        result = await geocode_village_district_state("Bhopal", "Bhopal", "Madhya Pradesh")
    assert result is not None
    assert result.latitude == pytest.approx(23.259933)
    assert result.longitude == pytest.approx(77.412614)


@pytest.mark.asyncio
async def test_geocode_rejects_low_importance():
    hits = [{"lat": "1", "lon": "2", "importance": 0.01, "address": {"country_code": "in"}}]

    async def _fake_to_thread(fn, *args):
        return fn(*args)

    with (
        patch("app.geo_nominatim._rate_limit", new=AsyncMock()),
        patch("app.geo_nominatim.asyncio.to_thread", side_effect=_fake_to_thread),
        patch("app.geo_nominatim._fetch_search", return_value=hits),
    ):
        result = await geocode_village_district_state("X", "Y", "Madhya Pradesh")
    assert result is None


@pytest.mark.asyncio
async def test_geocode_empty_query_returns_none():
    assert await geocode_village_district_state("", "Y", "Madhya Pradesh") is None
