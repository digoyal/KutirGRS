import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, deleteKutir } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { listClusters, listAreas, listDistricts } from "../api/geo";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { KUTIRS_FIELDS } from "../constants/kutirsFields";
import { canManageKutirs as roleCanManageKutirs, hasGlobalDataScope } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  clustersForDistrict,
  scopeClusters,
  scopeDistricts,
  type FilterId,
} from "../utils/geoFilters";

const STORAGE_KEY = "kutirs_filter_state";

export default function KutirsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);
  const canManageKutirs = roleCanManageKutirs(user?.title);

  useBfcacheReload();

  const saved = usePersistedFilterRestore<{ district?: FilterId; cluster?: FilterId }>(STORAGE_KEY);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? "");
  const [filterCluster, setFilterCluster] = useState<FilterId>(saved?.cluster ?? "");
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: kutirs = [], isLoading } = useQuery({ queryKey: ["kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],     queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });

  const areaMap    = new Map(allAreas.map((a) => [a.id, a]));
  const clusterMap = new Map(allClusters.map((c) => [c.id, c]));

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedClusters = scopeClusters(allClusters, user, unscoped);
  const filterClusters = clustersForDistrict(scopedClusters, areaMap, filterDistrict);

  useGeoFilterAutoSelect({
    scopedDistricts,
    filterClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    unscoped,
    clusterMode: "filtered",
  });

  const displayed = kutirs.filter(k => {
    if (filterCluster !== "" && k.cluster_id !== filterCluster) return false;
    if (filterDistrict !== "" && filterCluster === "") {
      const cl = clusterMap.get(k.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get(cl.area_id);
      if (!ar || ar.district_id !== filterDistrict) return false;
    }
    return true;
  });

  const deleteMut = useMutation({
    mutationFn: deleteKutir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kutirs"] }),
  });

  function saveFilters() {
    persistFilters(STORAGE_KEY, {
      district: filterDistrict, cluster: filterCluster,
    });
  }

  type KutirRow = typeof displayed[0];

  const allColumns: Col<KutirRow>[] = [
    { key: "name", label: "Name", sortable: true,
      render: r => <Link to={`/kutirs/${r.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{r.name}</Link>,
      csvValue: r => r.name },
    { key: "kutir_type", label: "Type", sortable: true },
    { key: "cluster_id", label: "Cluster", sortable: true,
      sortValue: r => clusterMap.get(r.cluster_id)?.name ?? "",
      render: r => <span style={{ fontSize: "0.82rem" }}>{clusterMap.get(r.cluster_id)?.name ?? "—"}</span>,
      csvValue: r => clusterMap.get(r.cluster_id)?.name ?? "" },
    { key: "street", label: "Street", sortable: false, render: r => r.street ?? "—", csvValue: r => r.street ?? "" },
    { key: "state", label: "State", sortable: true },
    { key: "pincode", label: "Pincode", sortable: true, render: r => r.pincode ?? "—", csvValue: r => r.pincode ?? "" },
    { key: "enrollment_5th", label: "5th Enroll", sortable: true, render: r => r.enrollment_5th ?? "—", csvValue: r => String(r.enrollment_5th ?? "") },
    { key: "enrollment_8th", label: "8th Enroll", sortable: true, render: r => r.enrollment_8th ?? "—", csvValue: r => String(r.enrollment_8th ?? "") },
  ];

  const { isVisible, orderedMetas } = useFieldConfig("kutirs", KUTIRS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Kutirs"
        columns={columns}
        data={displayed}
        rowKey={r => r.id}
        isLoading={isLoading}
        emptyMessage={kutirs.length === 0
          ? "No kutirs yet. Add geo data first (Zone → District → Area → Cluster), then add kutirs."
          : "No kutirs match the current filters."}
        searchable
        searchPlaceholder="Search kutirs…"
        searchFn={(r, q) => r.name.toLowerCase().includes(q)}
        filters={
          <GeoFilterBar
            district={filterDistrict}
            cluster={filterCluster}
            onChange={({ district, cluster }) => {
              setFilterDistrict(district);
              setFilterCluster(cluster);
            }}
            districts={scopedDistricts}
            clusters={scopedClusters}
            areas={allAreas}
            showKutir={false}
            clusterDisable="no-district"
          />
        }
        exportFilename="kutirs"
        printTitle="Kutirs"
        onAdd={canManageKutirs ? () => navigate("/kutirs/new") : undefined}
        actions={r => ({
          onView: () => { saveFilters(); navigate(`/kutirs/${r.id}`); },
          ...(canManageKutirs ? {
            onEdit: () => { saveFilters(); navigate(`/kutirs/${r.id}?edit=1`); },
            onDelete: () => setPendingDelete({ id: r.id, name: r.name }),
          } : {}),
        })}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={<>Delete kutir <strong>"{pendingDelete.name}"</strong>?</>}
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
