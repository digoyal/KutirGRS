import math


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters between two WGS84 points."""
    r = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def photo_distance_from_kutir_m(
    photo_lat: float,
    photo_lng: float,
    kutir_lat: float | None,
    kutir_lng: float | None,
) -> float | None:
    """Distance in metres from photo GPS to kutir; None when kutir coords missing."""
    if kutir_lat is None or kutir_lng is None:
        return None
    return haversine_m(photo_lat, photo_lng, kutir_lat, kutir_lng)
