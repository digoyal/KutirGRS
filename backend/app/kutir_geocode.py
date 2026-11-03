"""Geocode kutir records from kutir name + district + state."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.geo_nominatim import geocode_village_district_state
from app.models.geo import District
from app.models.kutirs import Kutir

logger = logging.getLogger(__name__)

ADDRESS_FIELDS = frozenset({"name", "district_id", "state", "street"})


async def try_geocode_kutir(db: AsyncSession, kutir: Kutir) -> str | None:
    """
    Fill kutir latitude/longitude from Nominatim when not manually set.
    Returns an optional admin-facing message when geocoding fails or is skipped.
    """
    if kutir.location_source == "manual" and kutir.latitude is not None and kutir.longitude is not None:
        return None
    if not kutir.district_id:
        msg = "Kutir saved; geocoding skipped (no district)."
        logger.warning("Kutir id=%s: %s", kutir.id, msg)
        return msg
    district = await db.get(District, kutir.district_id)
    if not district or not district.name:
        msg = "Kutir saved; geocoding skipped (district not found)."
        logger.warning("Kutir id=%s: %s", kutir.id, msg)
        return msg
    place = (kutir.name or "").strip()
    result = await geocode_village_district_state(place, district.name, kutir.state)
    if not result:
        msg = (
            f"Kutir saved; could not geocode location for "
            f"{place}, {district.name}, {kutir.state}."
        )
        logger.warning("Kutir id=%s: %s", kutir.id, msg)
        return msg
    kutir.latitude = result.latitude
    kutir.longitude = result.longitude
    kutir.location_source = "geocoded"
    kutir.geocoded_at = datetime.now(timezone.utc)
    logger.info(
        "Kutir id=%s geocoded to %.6f, %.6f (importance=%.3f)",
        kutir.id,
        result.latitude,
        result.longitude,
        result.importance,
    )
    return None
