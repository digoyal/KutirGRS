import type { CSSProperties, ReactNode } from "react";
import { grs } from "../styles/grs";
import {
  clustersForDistrict,
  kutirsForFilter,
  type AreaLike,
  type ClusterLike,
  type FilterId,
  type KutirLike,
  type KutirOptionsMode,
  type NamedId,
} from "../utils/geoFilters";

export type GeoFilterChange = {
  district: FilterId;
  cluster: FilterId;
  kutir: FilterId;
  /** Which level the user changed (downstream levels already cleared). */
  changed: "district" | "cluster" | "kutir";
};

export type ClusterDisableMode =
  /** Disabled until a district is chosen (Visits, Kutirs) */
  | "no-district"
  /** Students: allow when role defaulted a cluster */
  | "no-district-unless-default-cluster"
  /** Admissions/Progress: allow when a kutir is already selected */
  | "no-district-unless-kutir"
  | "never";

export type KutirDisableMode =
  | "no-cluster"
  | "no-cluster-unless-default-kutir"
  | "never";

export type KutirVisibility = "always" | "when-cluster";

export interface GeoFilterBarProps {
  district: FilterId;
  cluster?: FilterId;
  kutir?: FilterId;
  onChange: (next: GeoFilterChange) => void;

  districts: NamedId[];
  /** Required when showCluster or kutirMode needs area→district */
  clusters?: ClusterLike[];
  areas?: AreaLike[];
  kutirs?: KutirLike[];

  showCluster?: boolean;
  showKutir?: boolean;
  kutirMode?: KutirOptionsMode;
  clusterDisable?: ClusterDisableMode;
  kutirDisable?: KutirDisableMode;
  kutirVisibility?: KutirVisibility;

  /** Students disable rule */
  defaultCluster?: FilterId;
  defaultKutir?: FilterId;

  selectStyle?: CSSProperties;
  districtStyle?: CSSProperties;
  clusterStyle?: CSSProperties;
  kutirStyle?: CSSProperties;

  /** Wrap each select in a labeled field (NewYearSetup) */
  labeled?: boolean;
  districtLabel?: string;
  clusterLabel?: string;
  kutirLabel?: string;

  districtEmptyLabel?: string;
  clusterEmptyLabel?: string;
  kutirEmptyLabel?: string;

  leading?: ReactNode;
  trailing?: ReactNode;
}

function Field({
  labeled,
  label,
  children,
}: {
  labeled?: boolean;
  label?: string;
  children: ReactNode;
}) {
  if (!labeled) return <>{children}</>;
  return (
    <div>
      {label && (
        <label style={{ ...grs.fieldLabel, display: "block", marginBottom: 4 }}>{label}</label>
      )}
      {children}
    </div>
  );
}

export function GeoFilterBar({
  district,
  cluster = "",
  kutir = "",
  onChange,
  districts,
  clusters = [],
  areas = [],
  kutirs = [],
  showCluster = true,
  showKutir = true,
  kutirMode = "by-cluster",
  clusterDisable = "no-district",
  kutirDisable = "no-cluster",
  kutirVisibility = "always",
  defaultCluster = "",
  defaultKutir = "",
  selectStyle,
  districtStyle,
  clusterStyle,
  kutirStyle,
  labeled = false,
  districtLabel = "District",
  clusterLabel = "Cluster",
  kutirLabel = "Kutir",
  districtEmptyLabel = "All Districts",
  clusterEmptyLabel = "All Clusters",
  kutirEmptyLabel = "All Kutirs",
  leading,
  trailing,
}: GeoFilterBarProps) {
  const baseStyle = selectStyle ?? grs.filterSelect;
  const areaMap = new Map(areas.map((a) => [a.id, a]));
  const clusterMap = new Map(clusters.map((c) => [c.id, c]));

  const filterClusters = clustersForDistrict(clusters, areaMap, district);
  const filterKutirs = kutirsForFilter(kutirs, kutirMode, {
    filterDistrict: district,
    filterCluster: cluster,
    filterKutir: kutir,
    clusterMap,
    areaMap,
  });

  const clusterDisabled =
    clusterDisable === "never"
      ? false
      : clusterDisable === "no-district"
        ? district === ""
        : clusterDisable === "no-district-unless-default-cluster"
          ? district === "" && defaultCluster === ""
          : /* no-district-unless-kutir */
            district === "" && kutir === "";

  const kutirDisabled =
    kutirDisable === "never"
      ? false
      : kutirDisable === "no-cluster"
        ? cluster === ""
        : /* no-cluster-unless-default-kutir */
          cluster === "" && defaultKutir === "";

  const showKutirSelect =
    showKutir && (kutirVisibility === "always" || cluster !== "");

  function parseId(raw: string): FilterId {
    return raw === "" ? "" : Number(raw);
  }

  const content = (
    <>
      {leading}
      <Field labeled={labeled} label={districtLabel}>
        <select
          style={{ ...baseStyle, ...districtStyle }}
          value={district}
          onChange={(e) => {
            const next = parseId(e.target.value);
            onChange({ district: next, cluster: "", kutir: "", changed: "district" });
          }}
        >
          <option value="">{districtEmptyLabel}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      {showCluster && (
        <Field labeled={labeled} label={clusterLabel}>
          <select
            style={{ ...baseStyle, ...clusterStyle }}
            value={cluster}
            disabled={clusterDisabled}
            onChange={(e) => {
              const next = parseId(e.target.value);
              onChange({ district, cluster: next, kutir: "", changed: "cluster" });
            }}
          >
            <option value="">{clusterEmptyLabel}</option>
            {filterClusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showKutirSelect && (
        <Field labeled={labeled} label={kutirLabel}>
          <select
            style={
              kutirDisable === "no-cluster" && kutirDisabled
                ? { ...baseStyle, ...kutirStyle, opacity: 0.5 }
                : { ...baseStyle, ...kutirStyle }
            }
            value={kutir}
            disabled={kutirDisabled}
            onChange={(e) => {
              const next = parseId(e.target.value);
              onChange({ district, cluster, kutir: next, changed: "kutir" });
            }}
          >
            <option value="">{kutirEmptyLabel}</option>
            {filterKutirs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {trailing}
    </>
  );

  return content;
}
