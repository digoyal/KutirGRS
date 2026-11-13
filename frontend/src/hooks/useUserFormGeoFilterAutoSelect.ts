import { useEffect } from "react";
import { autoPickFilterId, type FilterId, type NamedId } from "../utils/geoFilters";

export type UserFormGeoLeaf = "zone" | "district" | "area" | "cluster" | "kutir" | null;

function toFilterId(v: number | null): FilterId {
  return v === null ? "" : v;
}

function fromFilterId(v: FilterId): number | null {
  return v === "" ? null : v;
}

function pickFilter(
  options: NamedId[],
  current: number | null,
  enabled: boolean,
  cascade: boolean,
): number | null {
  const picked = autoPickFilterId(options, toFilterId(current), enabled, {
    hasAll: true,
    cascade,
  });
  if (picked === null) return current;
  return fromFilterId(picked);
}

/**
 * User Add/Edit narrowing dropdowns (zone → district → area → cluster).
 * Auto-picks when the visible option list has exactly one entry and the value is empty.
 * Does not touch assignment checkboxes. Respects role `leaf` (skips hidden levels).
 */
export function useUserFormGeoFilterAutoSelect(opts: {
  leaf: UserFormGeoLeaf;
  allZones: NamedId[];
  filteredDistricts: NamedId[];
  filteredAreas: NamedId[];
  filteredClusters: NamedId[];
  filterZone: number | null;
  setFilterZone: (v: number | null) => void;
  filterDistrict: number | null;
  setFilterDistrict: (v: number | null) => void;
  filterArea: number | null;
  setFilterArea: (v: number | null) => void;
  filterCluster: number | null;
  setFilterCluster: (v: number | null) => void;
}): void {
  const {
    leaf,
    allZones,
    filteredDistricts,
    filteredAreas,
    filteredClusters,
    filterZone,
    setFilterZone,
    filterDistrict,
    setFilterDistrict,
    filterArea,
    setFilterArea,
    filterCluster,
    setFilterCluster,
  } = opts;

  useEffect(() => {
    if (leaf === null || leaf === "zone") return;

    const zoneAtStart = filterZone;
    const districtAtStart = filterDistrict;
    const areaAtStart = filterArea;
    const clusterAtStart = filterCluster;

    let zone = zoneAtStart;
    let district = districtAtStart;
    let area = areaAtStart;
    let cluster = clusterAtStart;

    const showsZone = leaf === "district" || leaf === "area" || leaf === "cluster" || leaf === "kutir";
    const showsDistrict =
      leaf === "district" || leaf === "area" || leaf === "cluster" || leaf === "kutir";
    const showsClusterFilter = leaf === "kutir";

    if (showsZone) {
      zone = pickFilter(allZones, zone, true, false);
    }

    const cascadeDistricts = zone !== zoneAtStart;

    if (showsDistrict) {
      const districtEnabled =
        leaf === "district" ||
        leaf === "cluster" ||
        ((leaf === "area" || leaf === "kutir") && zone !== null);
      district = pickFilter(filteredDistricts, district, districtEnabled, cascadeDistricts);
    }

    const cascadeAreas = zone !== zoneAtStart || district !== districtAtStart;

    // CC: area filter is optional refine — no auto-pick (matches list-hub behaviour).
    if (leaf === "kutir") {
      area = pickFilter(filteredAreas, area, district !== null, cascadeAreas);
    }

    const cascadeClusters = cascadeAreas || area !== areaAtStart;

    if (showsClusterFilter) {
      const clusterEnabled = area !== null;
      cluster = pickFilter(filteredClusters, cluster, clusterEnabled, cascadeClusters);
    }

    if (zone !== zoneAtStart) setFilterZone(zone);
    if (district !== districtAtStart) setFilterDistrict(district);
    if (area !== areaAtStart) setFilterArea(area);
    if (cluster !== clusterAtStart) setFilterCluster(cluster);
  }, [
    leaf,
    allZones,
    filteredDistricts,
    filteredAreas,
    filteredClusters,
    filterZone,
    filterDistrict,
    filterArea,
    filterCluster,
    setFilterZone,
    setFilterDistrict,
    setFilterArea,
    setFilterCluster,
  ]);
}
