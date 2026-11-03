/** Great-circle distance in meters between two WGS84 points. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type VisitPhotoDistanceStatus =
  | { kind: "no_photo" }
  | { kind: "no_kutir_coords"; warning: string }
  | { kind: "distance"; distanceM: number };

export function describeVisitPhotoDistance(
  photoLat: number | null | undefined,
  photoLng: number | null | undefined,
  kutirLat: number | null | undefined,
  kutirLng: number | null | undefined,
): VisitPhotoDistanceStatus {
  if (photoLat == null || photoLng == null) {
    return { kind: "no_photo" };
  }
  if (kutirLat == null || kutirLng == null) {
    return {
      kind: "no_kutir_coords",
      warning: "Kutir location not set — distance from kutir is not shown.",
    };
  }
  const distanceM = haversineM(photoLat, photoLng, kutirLat, kutirLng);
  return { kind: "distance", distanceM };
}
