import { useEffect } from "react";
import type {
  AreaLike,
  ClusterLike,
  FilterId,
  KutirLike,
  KutirOptionsMode,
  NamedId,
} from "../utils/geoFilters";
import { autoPickFilterId, autoPickScalarFilter, clustersForDistrict, kutirsForFilter } from "../utils/geoFilters";

export type ClusterAutoSelectMode =
  /** Progress/Students/Admissions/Visits: district-filtered cluster list (same as GeoFilterBar). */
  | "scoped-non-admin"
  /** Kutirs: single option in the district-filtered cluster list (any role) */
  | "filtered"
  | "none";

/**
 * - `list-hub`: empty value means **All** — singleton auto-pick; multi options cascade to All.
 * - `picker`: empty value is **placeholder only** — auto-pick only when exactly one visible option.
 */
export type GeoAutoSelectMode = "list-hub" | "picker";

type ClusterDisableMode =
  | "no-district"
  | "no-district-unless-default-cluster"
  | "no-district-unless-kutir"
  | "never";

type KutirDisableMode = "no-cluster" | "no-cluster-unless-default-kutir" | "never";

type KutirVisibility = "always" | "when-cluster";

function clusterSelectDisabled(
  mode: ClusterDisableMode,
  district: FilterId,
  kutir: FilterId,
  defaultCluster: FilterId,
): boolean {
  if (mode === "never") return false;
  if (mode === "no-district") return district === "";
  if (mode === "no-district-unless-default-cluster") {
    return district === "" && defaultCluster === "";
  }
  return district === "" && kutir === "";
}

function kutirSelectDisabled(
  mode: KutirDisableMode,
  cluster: FilterId,
  defaultKutir: FilterId,
): boolean {
  if (mode === "never") return false;
  if (mode === "no-cluster") return cluster === "";
  return cluster === "" && defaultKutir === "";
}

function kutirSelectShown(visibility: KutirVisibility, cluster: FilterId): boolean {
  return visibility === "always" || cluster !== "";
}

/**
 * List-hub geo filters: when a dropdown’s **visible** option list (same rules as
 * {@link GeoFilterBar}) has exactly one entry and the current value is empty
 * (“All” / “-- Select --”), pick that option automatically.
 *
 * - Cascades in one pass: one district → one cluster → one kutir.
 * - Re-runs when upstream filters change (e.g. district pick leaves one cluster).
 * - Does **not** override non-empty values (including role defaults).
 * - Use `skip*Auto` when session restore intentionally stored a key (see Visits);
 *   omit skip when there was no saved blob so first visit can auto-pick.
 * - Multiple visible options with an All choice: cascade reset to All; initial load keeps a valid pick.
 * - Singleton lists auto-fill when empty or stale after upstream change.
 */
export function useGeoFilterAutoSelect(opts: {
  scopedDistricts: NamedId[];
  scopedClusters?: ClusterLike[];
  scopedKutirs?: KutirLike[];
  areas?: AreaLike[];
  filterDistrict: FilterId;
  filterCluster: FilterId;
  setFilterDistrict: (id: FilterId) => void;
  setFilterCluster: (id: FilterId) => void;
  filterKutir?: FilterId;
  setFilterKutir?: (id: FilterId) => void;
  kutirMode?: KutirOptionsMode;
  clusterDisable?: ClusterDisableMode;
  kutirDisable?: KutirDisableMode;
  kutirVisibility?: KutirVisibility;
  defaultCluster?: FilterId;
  defaultKutir?: FilterId;
  /** Kept for call-site compatibility; auto-pick uses visible option counts only. */
  unscoped?: boolean;
  clusterMode?: ClusterAutoSelectMode;
  skipDistrictAuto?: boolean;
  skipClusterAuto?: boolean;
  skipKutirAuto?: boolean;
  autoSelectMode?: GeoAutoSelectMode;
}): void {
  const {
    scopedDistricts,
    scopedClusters = [],
    scopedKutirs = [],
    areas = [],
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    filterKutir = "",
    setFilterKutir,
    kutirMode = "by-cluster",
    clusterDisable = "no-district",
    kutirDisable = "no-cluster",
    kutirVisibility = "always",
    defaultCluster = "",
    defaultKutir = "",
    clusterMode = "scoped-non-admin",
    skipDistrictAuto = false,
    skipClusterAuto = false,
    skipKutirAuto = false,
    autoSelectMode = "list-hub",
  } = opts;

  const hasAll = autoSelectMode === "list-hub";

  const areaMap = areas.length > 0 ? new Map(areas.map((a) => [a.id, a])) : undefined;
  const clusterMap =
    scopedClusters.length > 0 ? new Map(scopedClusters.map((c) => [c.id, c])) : undefined;

  useEffect(() => {
    const districtOnly = clusterMode === "none" && !setFilterKutir;

    const districtAtStart = filterDistrict;
    const clusterAtStart = filterCluster;
    const kutirAtStart = filterKutir;

    let district = districtAtStart;
    let cluster = clusterAtStart;
    let kutir = kutirAtStart;

    const clustersForBar = (d: FilterId): NamedId[] => {
      if (clusterMode === "none") return [];
      return clustersForDistrict(scopedClusters, areaMap ?? new Map(), d);
    };

    const kutirsForBar = (d: FilterId, c: FilterId, k: FilterId): KutirLike[] =>
      kutirsForFilter(scopedKutirs, kutirMode, {
        filterDistrict: d,
        filterCluster: c,
        filterKutir: k,
        clusterMap,
        areaMap,
      });

    const districtPick = autoPickFilterId(scopedDistricts, district, true, {
      hasAll,
      skip: skipDistrictAuto,
      cascade: false,
    });
    if (districtPick !== null) district = districtPick;

    if (districtOnly) {
      if (district !== districtAtStart) setFilterDistrict(district);
      return;
    }

    const cascadeClusters = district !== districtAtStart;

    if (clusterMode !== "none") {
      const list = clustersForBar(district);
      const disabled = clusterSelectDisabled(clusterDisable, district, kutir, defaultCluster);
      const clusterPick = autoPickFilterId(list, cluster, !disabled, {
        hasAll,
        skip: skipClusterAuto,
        cascade: cascadeClusters,
      });
      if (clusterPick !== null) cluster = clusterPick;
    }

    const cascadeKutirs = district !== districtAtStart || cluster !== clusterAtStart;

    if (setFilterKutir && kutirSelectShown(kutirVisibility, cluster)) {
      const list = kutirsForBar(district, cluster, kutir);
      const disabled = kutirSelectDisabled(kutirDisable, cluster, defaultKutir);
      const kutirPick = autoPickFilterId(
        list.map((k) => ({ id: k.id, name: k.name })),
        kutir,
        !disabled,
        { hasAll, skip: skipKutirAuto, cascade: cascadeKutirs },
      );
      if (kutirPick !== null) kutir = kutirPick;
    }

    if (district !== districtAtStart) setFilterDistrict(district);
    if (cluster !== clusterAtStart) setFilterCluster(cluster);
    if (setFilterKutir && kutir !== kutirAtStart) setFilterKutir(kutir);
  }, [
    scopedDistricts,
    scopedClusters,
    scopedKutirs,
    filterDistrict,
    filterCluster,
    filterKutir,
    clusterMode,
    kutirMode,
    clusterDisable,
    kutirDisable,
    kutirVisibility,
    defaultCluster,
    defaultKutir,
    skipDistrictAuto,
    skipClusterAuto,
    skipKutirAuto,
    hasAll,
    setFilterDistrict,
    setFilterCluster,
    setFilterKutir,
    areas,
  ]);
}

/**
 * Non-geo dropdowns (e.g. Progress year with “All years”). Same rules as geo filters;
 * pass `hasAll: false` when there is no All option (e.g. Admissions year list).
 */
export function useSingleOptionAutoSelect<T extends string | number>(opts: {
  options: readonly T[];
  value: T | "";
  setValue: (v: T | "") => void;
  skip?: boolean;
  hasAll?: boolean;
  /** Set when upstream geo filters change and this control should re-default. */
  cascade?: boolean;
}): void {
  const { options, value, setValue, skip = false, hasAll = false, cascade = false } = opts;

  useEffect(() => {
    const picked = autoPickScalarFilter(options, value, true, { hasAll, skip, cascade });
    if (picked !== null) setValue(picked);
  }, [options, value, skip, hasAll, cascade, setValue]);
}
