import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  listAreas,
  listClusters,
  listDistricts,
  listGeoAssignments,
  listZones,
  type Area,
  type Cluster,
  type District,
  type GeoAssignment,
  type Zone,
} from "../api/geo";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import {
  autoPickFilterId,
  countActiveFilters,
  defaultGeoAssignmentEntityLevel,
  type FilterId,
} from "../utils/geoFilters";

const ENTITY_LEVELS = ["Zone", "District", "Area", "Cluster"] as const;
type EntityLevel = (typeof ENTITY_LEVELS)[number];
type EntityLevelSelection = EntityLevel | "";

type Row = GeoAssignment & { id: string };

const COLUMN_LABELS: Record<
  EntityLevel,
  { parentName: string; parentHead: string; entityName: string; entityHead: string }
> = {
  Zone: {
    parentName: "State",
    parentHead: "",
    entityName: "Zone",
    entityHead: "Regional Head",
  },
  District: {
    parentName: "Zone",
    parentHead: "Regional Head",
    entityName: "District",
    entityHead: "District Anchor",
  },
  Area: {
    parentName: "District",
    parentHead: "District Anchor",
    entityName: "Area",
    entityHead: "Education Coordinator",
  },
  Cluster: {
    parentName: "Area",
    parentHead: "Education Coordinator",
    entityName: "Cluster",
    entityHead: "Cluster Coordinator",
  },
};

const geoFilterSelect: React.CSSProperties = {
  ...grs.filterSelect,
  width: 136,
  flex: "1 1 104px",
  minWidth: 0,
  maxWidth: 168,
};

const entityLevelSelect: React.CSSProperties = {
  ...geoFilterSelect,
  flex: "0 0 108px",
  width: 108,
  maxWidth: 108,
};

function dashIfEmpty(value: string): string {
  return value.trim() ? value : "—";
}

/** List-hub min widths — avoid legacy ~64px caps; Table applies ellipsis at DATA_COL_MAX. */
const GEO_ENTITY_MIN_W = 112;
const GEO_HEAD_MIN_W = 132;

function geoEntityNameCol(
  col: Omit<Col<Row>, "minWidth"> & Partial<Pick<Col<Row>, "minWidth">>,
): Col<Row> {
  return {
    ...col,
    minWidth: col.minWidth ?? GEO_ENTITY_MIN_W,
  };
}

function geoHeadNameCol(
  col: Omit<Col<Row>, "minWidth"> & Partial<Pick<Col<Row>, "minWidth">>,
): Col<Row> {
  return {
    ...col,
    minWidth: col.minWidth ?? GEO_HEAD_MIN_W,
  };
}

const chainThroughDistrictHeadCols: Col<Row>[] = [
  geoEntityNameCol({
    key: "zone_name",
    label: "Zone",
    sortable: true,
    render: (r) => dashIfEmpty(r.zone_name),
  }),
  geoHeadNameCol({
    key: "zone_head",
    label: "Regional Head",
    sortable: true,
    render: (r) => dashIfEmpty(r.zone_head),
  }),
  geoEntityNameCol({
    key: "district_name",
    label: "District",
    sortable: true,
    render: (r) => dashIfEmpty(r.district_name),
  }),
  geoHeadNameCol({
    key: "district_head",
    label: "District Anchor",
    sortable: true,
    render: (r) => dashIfEmpty(r.district_head),
  }),
];

export default function GeoAssignmentsPage() {
  const { user } = useAuth();
  const defaultEntityLevelApplied = useRef(false);

  const [entityLevel, setEntityLevel] = useState<EntityLevelSelection>(() =>
    defaultGeoAssignmentEntityLevel(user),
  );
  const [zoneId, setZoneId] = useState<FilterId>("");
  const [districtId, setDistrictId] = useState<FilterId>("");
  const [areaId, setAreaId] = useState<FilterId>("");
  const [clusterId, setClusterId] = useState<FilterId>("");

  const geoFiltersEnabled = entityLevel !== "";

  useEffect(() => {
    if (defaultEntityLevelApplied.current) return;
    const level = defaultGeoAssignmentEntityLevel(user);
    if (level === "") return;
    defaultEntityLevelApplied.current = true;
    setEntityLevel(level);
  }, [user]);

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: listZones,
    enabled: geoFiltersEnabled,
  });
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["districts"],
    queryFn: () => listDistricts(),
    enabled: geoFiltersEnabled,
  });
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: () => listAreas(),
    enabled: geoFiltersEnabled,
  });
  const { data: clusters = [] } = useQuery<Cluster[]>({
    queryKey: ["clusters"],
    queryFn: () => listClusters(),
    enabled: geoFiltersEnabled,
  });

  useEffect(() => {
    if (user?.title !== "District Anchor" || entityLevel === "") return;
    const pick = autoPickFilterId(zones, zoneId, true);
    if (pick !== null) setZoneId(pick);
  }, [user?.title, entityLevel, zones, zoneId]);

  const districtsInZone = useMemo(
    () => (zoneId === "" ? districts : districts.filter((d) => d.zone_id === zoneId)),
    [districts, zoneId],
  );

  const areasInDistrict = useMemo(
    () =>
      districtId === ""
        ? areas
        : areas.filter((a) => a.district_id === districtId),
    [areas, districtId],
  );

  const clustersInArea = useMemo(() => {
    if (areaId !== "") {
      return clusters.filter((c) => c.area_id === areaId);
    }
    if (districtId === "") return clusters;
    const areaIds = new Set(areasInDistrict.map((a) => a.id));
    return clusters.filter((c) => areaIds.has(c.area_id));
  }, [areasInDistrict, areaId, clusters, districtId]);

  const geoParams = useMemo(() => {
    if (entityLevel === "") return null;
    return {
      entity_level: entityLevel,
      zone_id: zoneId === "" ? undefined : zoneId,
      district_id:
        entityLevel === "Zone" || districtId === "" ? undefined : districtId,
      area_id:
        (entityLevel !== "Cluster" && entityLevel !== "Area") ||
        areaId === ""
          ? undefined
          : areaId,
      cluster_id:
        entityLevel !== "Cluster" || clusterId === "" ? undefined : clusterId,
    };
  }, [entityLevel, zoneId, districtId, areaId, clusterId]);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["geo-assignments", geoParams],
    queryFn: () => listGeoAssignments(geoParams!),
    enabled: geoParams !== null,
  });

  const tableRows = useMemo<Row[]>(
    () => rows.map((r) => ({ ...r, id: `${r.entity_level}-${r.entity_id}` })),
    [rows],
  );

  const labels =
    entityLevel === "" ? COLUMN_LABELS.District : COLUMN_LABELS[entityLevel];

  const columns = useMemo<Col<Row>[]>(() => {
    if (entityLevel === "") {
      return [];
    }
    if (entityLevel === "Area") {
      return [
        ...chainThroughDistrictHeadCols,
        geoEntityNameCol({
          key: "area_name",
          label: "Area",
          sortable: true,
          render: (r) => <strong>{r.area_name}</strong>,
        }),
        geoHeadNameCol({
          key: "area_head",
          label: "Education Coordinator",
          sortable: true,
          render: (r) => dashIfEmpty(r.area_head),
        }),
      ];
    }
    if (entityLevel === "Cluster") {
      return [
        ...chainThroughDistrictHeadCols,
        geoEntityNameCol({
          key: "area_name",
          label: "Area",
          sortable: true,
          render: (r) => dashIfEmpty(r.area_name),
        }),
        geoHeadNameCol({
          key: "area_head",
          label: "Education Coordinator",
          sortable: true,
          render: (r) => dashIfEmpty(r.area_head),
        }),
        geoEntityNameCol({
          key: "entity_name",
          label: "Cluster",
          sortable: true,
          render: (r) => <strong>{r.entity_name}</strong>,
        }),
        geoHeadNameCol({
          key: "entity_head",
          label: "Cluster Coordinator",
          sortable: true,
          render: (r) => dashIfEmpty(r.entity_head),
        }),
      ];
    }
    if (entityLevel === "Zone") {
      return [
        geoEntityNameCol({
          key: "parent_entity_name",
          label: labels.parentName,
          sortable: true,
          render: (r) => dashIfEmpty(r.parent_entity_name),
        }),
        geoEntityNameCol({
          key: "entity_name",
          label: labels.entityName,
          sortable: true,
          render: (r) => <strong>{r.entity_name}</strong>,
        }),
        geoHeadNameCol({
          key: "entity_head",
          label: labels.entityHead,
          sortable: true,
          render: (r) => dashIfEmpty(r.entity_head),
        }),
      ];
    }
    return [
      geoEntityNameCol({
        key: "parent_entity_name",
        label: labels.parentName,
        sortable: true,
        render: (r) => dashIfEmpty(r.parent_entity_name),
      }),
      geoHeadNameCol({
        key: "parent_entity_head",
        label: labels.parentHead,
        sortable: true,
        render: (r) => dashIfEmpty(r.parent_entity_head),
      }),
      geoEntityNameCol({
        key: "entity_name",
        label: labels.entityName,
        sortable: true,
        render: (r) => <strong>{r.entity_name}</strong>,
      }),
      geoHeadNameCol({
        key: "entity_head",
        label: labels.entityHead,
        sortable: true,
        render: (r) => dashIfEmpty(r.entity_head),
      }),
    ];
  }, [entityLevel, labels]);

  function onEntityLevelChange(next: EntityLevelSelection) {
    setEntityLevel(next);
    setZoneId("");
    setDistrictId("");
    setAreaId("");
    setClusterId("");
  }

  function onZoneChange(next: FilterId) {
    setZoneId(next);
    setDistrictId("");
    setAreaId("");
    setClusterId("");
  }

  function onDistrictChange(next: FilterId) {
    setDistrictId(next);
    setAreaId("");
    setClusterId("");
  }

  function onAreaChange(next: FilterId) {
    setAreaId(next);
    setClusterId("");
  }

  const showZone = geoFiltersEnabled;
  const showDistrict =
    entityLevel === "District" ||
    entityLevel === "Area" ||
    entityLevel === "Cluster";
  const showArea = entityLevel === "Area" || entityLevel === "Cluster";
  const showCluster = entityLevel === "Cluster";

  const activeFilterCount = countActiveFilters(
    zoneId,
    showDistrict ? districtId : "",
    showArea ? areaId : "",
    showCluster ? clusterId : "",
  );

  return (
    <div className="grs-page" style={{ padding: "24px 28px", minWidth: 0 }}>
      <header className="grs-report-page-header">
        <div className="grs-report-page-header-main">
          <Link to="/geo" className="grs-page-back" style={{ textDecoration: "none" }}>
            ← Geography
          </Link>
          <h2 className="grs-page-title grs-report-page-title">Geo Assignments</h2>
        </div>
      </header>

      <GrsTable<Row>
        title="Geo Assignments"
        showPageHeader={false}
        columns={columns}
        data={tableRows}
        shellFullWidth
        listHubGrow
        rowKey={(r) => r.id}
        isLoading={geoFiltersEnabled && isLoading}
        emptyMessage={
          entityLevel === ""
            ? "Select an entity level."
            : isError
              ? "Could not load assignments."
              : "No geography entities in your scope."
        }
        exportFilename="geo-assignments"
        printTitle="Geo Assignments"
        filters={
          <div className="grs-filter-controls">
            <select
              style={entityLevelSelect}
              aria-label="Entity level"
              value={entityLevel}
              onChange={(e) => {
                const v = e.target.value;
                onEntityLevelChange(
                  v === "" ? "" : (v as EntityLevel),
                );
              }}
            >
              <option value="">-Select Entity-</option>
              {ENTITY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {showZone && (
              <select
                style={geoFilterSelect}
                aria-label="Zone"
                value={zoneId === "" ? "" : String(zoneId)}
                onChange={(e) =>
                  onZoneChange(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">All zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            )}
            {showDistrict && (
              <select
                style={geoFilterSelect}
                aria-label="District"
                value={districtId === "" ? "" : String(districtId)}
                disabled={zoneId !== "" && districtsInZone.length === 0}
                onChange={(e) =>
                  onDistrictChange(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              >
                <option value="">All districts</option>
                {(zoneId === "" ? districts : districtsInZone).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {showArea && (
              <select
                style={geoFilterSelect}
                aria-label="Area"
                value={areaId === "" ? "" : String(areaId)}
                disabled={districtId !== "" && areasInDistrict.length === 0}
                onChange={(e) =>
                  onAreaChange(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">All areas</option>
                {(districtId === "" ? areas : areasInDistrict).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            {showCluster && (
              <select
                style={geoFilterSelect}
                aria-label="Cluster"
                value={clusterId === "" ? "" : String(clusterId)}
                onChange={(e) =>
                  setClusterId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">All clusters</option>
                {clustersInArea.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}