import { useEffect } from "react";
import type { FilterId, NamedId } from "../utils/geoFilters";

export type ClusterAutoSelectMode =
  /** Progress/Students/Admissions/Visits: single scoped cluster when !isAdmin */
  | "scoped-non-admin"
  /** Kutirs: single option in the district-filtered cluster list (any role) */
  | "filtered"
  | "none";

/**
 * Auto-select when the user is scoped to a single district/cluster.
 * Preserves each page's previous rules via `clusterMode` / `skipIf*`.
 */
export function useGeoFilterAutoSelect(opts: {
  scopedDistricts: NamedId[];
  /** Used when clusterMode === "scoped-non-admin" */
  scopedClusters?: NamedId[];
  /** Used when clusterMode === "filtered" (Kutirs) */
  filterClusters?: NamedId[];
  filterDistrict: FilterId;
  filterCluster: FilterId;
  setFilterDistrict: (id: FilterId) => void;
  setFilterCluster: (id: FilterId) => void;
  isAdmin: boolean;
  clusterMode?: ClusterAutoSelectMode;
  /** Visits: skip district auto when storage restored a district key (incl. "") */
  skipDistrictAuto?: boolean;
  skipClusterAuto?: boolean;
}): void {
  const {
    scopedDistricts,
    scopedClusters = [],
    filterClusters = [],
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    isAdmin,
    clusterMode = "scoped-non-admin",
    skipDistrictAuto = false,
    skipClusterAuto = false,
  } = opts;

  useEffect(() => {
    if (skipDistrictAuto) return;
    if (scopedDistricts.length === 1 && filterDistrict === "") {
      setFilterDistrict(scopedDistricts[0].id);
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipClusterAuto || clusterMode === "none") return;
    if (clusterMode === "scoped-non-admin") {
      if (scopedClusters.length === 1 && filterCluster === "" && !isAdmin) {
        setFilterCluster(scopedClusters[0].id);
      }
    } else if (clusterMode === "filtered") {
      if (filterClusters.length === 1 && filterCluster === "") {
        setFilterCluster(filterClusters[0].id);
      }
    }
  }, [
    clusterMode === "filtered" ? filterClusters.length : scopedClusters.length,
  ]); // eslint-disable-line react-hooks/exhaustive-deps
}
