"""OSM Nominatim geocoding (backend-only, no API key)."""
from __future__ import annotations

import asyncio
import json
import logging
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim usage policy: identify app + contact; max ~1 req/s.
USER_AGENT = "KutirGRS/1.0 (local dev; contact admin@kutirgrs.local)"
MIN_IMPORTANCE = 0.35
_RATE_LOCK = asyncio.Lock()
_last_request_at = 0.0


@dataclass(frozen=True)
class GeocodeResult:
    latitude: float
    longitude: float
    importance: float
    display_name: str


async def _rate_limit() -> None:
    global _last_request_at
    async with _RATE_LOCK:
        now = time.monotonic()
        wait = 1.0 - (now - _last_request_at)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request_at = time.monotonic()


def _fetch_search(query: str) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": "in",
            "addressdetails": 1,
        }
    )
    url = f"{NOMINATIM_SEARCH_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
    data = json.loads(raw)
    return data if isinstance(data, list) else []


def _parse_hit(hit: dict[str, Any]) -> GeocodeResult | None:
    try:
        lat = float(hit["lat"])
        lon = float(hit["lon"])
        importance = float(hit.get("importance") or 0)
    except (KeyError, TypeError, ValueError):
        return None
    address = hit.get("address")
    if isinstance(address, dict):
        cc = str(address.get("country_code") or "").lower()
        if cc and cc != "in":
            return None
    display = str(hit.get("display_name") or "")
    return GeocodeResult(latitude=lat, longitude=lon, importance=importance, display_name=display)


async def geocode_village_district_state(
    village: str,
    district_name: str,
    state: str,
) -> GeocodeResult | None:
    """Geocode `{village}, {district}, {state}, India` via Nominatim."""
    village = (village or "").strip()
    district_name = (district_name or "").strip()
    state = (state or "").strip()
    if not village or not district_name or not state:
        return None
    query = f"{village}, {district_name}, {state}, India"
    await _rate_limit()
    try:
        hits = await asyncio.to_thread(_fetch_search, query)
    except Exception as exc:
        logger.warning("Nominatim request failed for %r: %s", query, exc)
        return None
    if not hits:
        logger.info("Nominatim: no results for %r", query)
        return None
    parsed = _parse_hit(hits[0])
    if not parsed:
        logger.info("Nominatim: unparseable result for %r", query)
        return None
    if parsed.importance < MIN_IMPORTANCE:
        logger.info(
            "Nominatim: low confidence (importance=%.3f) for %r → %s",
            parsed.importance,
            parsed.display_name,
        )
        return None
    return parsed
