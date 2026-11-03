import type { Kutir } from "../api/kutirs";
import type { Area, Cluster, District } from "../api/geo";
import { metaGet, metaPut } from "./offlineDbCore";

const META_KEY = "geo-kutir-lookups";

export type GeoKutirLookupCache = {
  kutirs: Kutir[];
  districts: District[];
  areas: Area[];
  clusters: Cluster[];
  cachedAt: string;
};

/** @deprecated use geo-kutir-lookups; migrates visit-lookups on read */
const LEGACY_VISIT_KEY = "visit-lookups";

export async function saveGeoKutirLookupCache(
  cache: Omit<GeoKutirLookupCache, "cachedAt">,
): Promise<void> {
  await metaPut(META_KEY, { ...cache, cachedAt: new Date().toISOString() });
}

export async function loadGeoKutirLookupCache(): Promise<GeoKutirLookupCache | null> {
  const current = await metaGet<GeoKutirLookupCache>(META_KEY);
  if (current) return current;
  const legacy = await metaGet<GeoKutirLookupCache>(LEGACY_VISIT_KEY);
  if (legacy) {
    await saveGeoKutirLookupCache(legacy);
    return legacy;
  }
  return null;
}
