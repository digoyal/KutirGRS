/** GPS captured via browser geolocation when a visit photo is attached. */
export type VisitPhotoLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
};

const GEO_TIMEOUT_MS = 12_000;

/** Best-effort location at photo attach time; null if denied, timed out, or unavailable. */
export function requestVisitPhotoLocation(): Promise<VisitPhotoLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

export function formatVisitPhotoCoords(lat: number, lng: number, accuracyM?: number | null): string {
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  if (accuracyM != null && Number.isFinite(accuracyM)) {
    return `${latStr}, ${lngStr} (±${Math.round(accuracyM)} m)`;
  }
  return `${latStr}, ${lngStr}`;
}

export function visitPhotoMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}
