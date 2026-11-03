import type { Kutir } from "../api/kutirs";
import { describeVisitPhotoDistance } from "./geoHaversine";
import type { VisitPhotoLocation } from "./visitPhotoGeolocation";

export function validateVisitPhotoForSave(
  photoFile: File | null,
  photoLocation: VisitPhotoLocation | null,
  kutirId: number | null | undefined,
  kutirs: Kutir[],
): { error: string | null; warning: string | null } {
  if (!photoFile) {
    return { error: null, warning: null };
  }
  if (!photoLocation) {
    return {
      error:
        "Visit photo requires device location — enable location/GPS permission, re-attach the photo, and try again.",
      warning: null,
    };
  }
  const kutir = kutirs.find((k) => k.id === kutirId);
  const status = describeVisitPhotoDistance(
    photoLocation.latitude,
    photoLocation.longitude,
    kutir?.latitude,
    kutir?.longitude,
  );
  if (status.kind === "no_kutir_coords") {
    return { error: null, warning: status.warning };
  }
  return { error: null, warning: null };
}
