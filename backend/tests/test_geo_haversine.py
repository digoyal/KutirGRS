from app.geo_haversine import haversine_m, photo_distance_from_kutir_m


def test_haversine_same_point_is_zero():
    assert haversine_m(23.2599, 77.4126, 23.2599, 77.4126) == 0.0


def test_haversine_known_approx_one_km_north():
    # ~111km per degree latitude; 0.009° ≈ 1km
    dist = haversine_m(23.0, 77.0, 23.009, 77.0)
    assert 950 <= dist <= 1050


def test_photo_distance_from_kutir_m_none_without_kutir_coords():
    assert photo_distance_from_kutir_m(23.0, 77.0, None, 77.0) is None


def test_photo_distance_from_kutir_m_matches_haversine():
    d = photo_distance_from_kutir_m(23.0, 77.0, 23.009, 77.0)
    assert d is not None
    assert 950 <= d <= 1050
