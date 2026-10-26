/** Shared geo-filter cascade helpers for list pages (R7). */

export type FilterId = number | "";

export interface GeoFilterValue {
  district: FilterId;
  cluster: FilterId;
  kutir: FilterId;
}

export interface GeoScopedUser {
  title: string;
  district_ids: number[];
  cluster_ids: number[];
  kutir_ids: number[];
}

export interface NamedId {
  id: number;
  name: string;
}

export interface AreaLike {
  id: number;
  district_id: number;
}

export interface ClusterLike {
  id: number;
  name: string;
  area_id: number;
}

export interface KutirLike {
  id: number;
  name: string;
  cluster_id: number;
}

/** Role-based initial filters (Students / Admissions / Progress). */
export function defaultsFromUser(user: GeoScopedUser | null | undefined): GeoFilterValue {
  if (!user) return { district: "", cluster: "", kutir: "" };
  if (user.title === "District Anchor" && user.district_ids.length > 0) {
    return { district: user.district_ids[0], cluster: "", kutir: "" };
  }
  if (user.title === "Cluster Coordinator" && user.cluster_ids.length > 0) {
    return { district: "", cluster: user.cluster_ids[0], kutir: "" };
  }
  if (user.title === "Teacher" && user.kutir_ids.length > 0) {
    return { district: "", cluster: "", kutir: user.kutir_ids[0] };
  }
  return { district: "", cluster: "", kutir: "" };
}

export function scopeDistricts<T extends NamedId>(
  all: T[],
  user: GeoScopedUser | null | undefined,
  /** True for Admin / SysAdmin (unrestricted). */
  unscoped: boolean,
): T[] {
  if (unscoped || !user) return all;
  return all.filter((d) => user.district_ids.includes(d.id));
}

export function scopeClusters<T extends NamedId>(
  all: T[],
  user: GeoScopedUser | null | undefined,
  unscoped: boolean,
): T[] {
  if (unscoped || !user) return all;
  return user.cluster_ids.length > 0
    ? all.filter((c) => user.cluster_ids.includes(c.id))
    : all;
}

export function scopeKutirs<T extends NamedId>(
  all: T[],
  user: GeoScopedUser | null | undefined,
  unscoped: boolean,
): T[] {
  if (unscoped || !user) return all;
  return user.kutir_ids.length > 0
    ? all.filter((k) => user.kutir_ids.includes(k.id))
    : all;
}

export function clustersForDistrict(
  scopedClusters: ClusterLike[],
  areaMap: Map<number, AreaLike>,
  filterDistrict: FilterId,
): ClusterLike[] {
  return scopedClusters.filter(
    (c) => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict,
  );
}

/**
 * How kutir options are built for the dropdown.
 * - `all`: every scoped kutir (Visits)
 * - `by-cluster`: when cluster set, that cluster; else all (Students)
 * - `by-cluster-or-selected`: cluster → that cluster; else if kutir set → that one; else [] (Admissions/Progress)
 * - `by-district`: kutirs whose cluster→area matches district (NewYearSetup; no cluster level)
 */
export type KutirOptionsMode =
  | "all"
  | "by-cluster"
  | "by-cluster-or-selected"
  | "by-district";

export function kutirsForFilter(
  scopedKutirs: KutirLike[],
  mode: KutirOptionsMode,
  opts: {
    filterDistrict: FilterId;
    filterCluster: FilterId;
    filterKutir: FilterId;
    clusterMap?: Map<number, ClusterLike>;
    areaMap?: Map<number, AreaLike>;
  },
): KutirLike[] {
  const { filterDistrict, filterCluster, filterKutir, clusterMap, areaMap } = opts;
  switch (mode) {
    case "all":
      return scopedKutirs;
    case "by-cluster":
      return scopedKutirs.filter((k) =>
        filterCluster !== "" ? k.cluster_id === filterCluster : true,
      );
    case "by-cluster-or-selected":
      return scopedKutirs.filter((k) =>
        filterCluster !== ""
          ? k.cluster_id === filterCluster
          : filterKutir !== ""
            ? k.id === filterKutir
            : false,
      );
    case "by-district":
      if (filterDistrict === "") return scopedKutirs;
      if (!clusterMap || !areaMap) return scopedKutirs;
      return scopedKutirs.filter((k) => {
        const cl = clusterMap.get(k.cluster_id);
        if (!cl) return false;
        const ar = areaMap.get(cl.area_id);
        return ar?.district_id === filterDistrict;
      });
    default:
      return scopedKutirs;
  }
}
