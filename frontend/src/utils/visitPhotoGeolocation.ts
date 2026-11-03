/** GPS captured via browser geolocation when a visit photo is attached. */
export type VisitPhotoLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
};

const GEO_TIMEOUT_MS = 12_000;

export class VisitPhotoLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitPhotoLocationError";
  }
}

/** Requires browser GPS at photo attach time. */
export function requestVisitPhotoLocation(): Promise<VisitPhotoLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new VisitPhotoLocationError(
        "Location is not available in this browser — visit photo cannot be saved.",
      ),
    );
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new VisitPhotoLocationError(
              "Location permission denied — enable location/GPS to attach a visit photo.",
            ),
          );
          return;
        }
        reject(
          new VisitPhotoLocationError(
            "Could not get device location — check GPS/location settings and try again.",
          ),
        );
      },
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
