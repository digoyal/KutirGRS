import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, deleteKutir, type Kutir } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { listClusters, listAreas, listDistricts } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { KUTIRS_FIELDS } from "../constants/kutirsFields";

// Restore filter state saved before navigating to edit/view
const _savedFilters = (() => {
  try {
    const s = sessionStorage.getItem("kutirs_filter_state");
    if (s) { sessionStorage.removeItem("kutirs_filter_state"); return JSON.parse(s); }
  } catch {}
  return null;
})();

export default function KutirsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const MANAGER_ROLES_K = ["Admin", "Regional Head", "District Anchor", "Education Coordinator", "Cluster Coordinator"];
  const canManageKutirs = MANAGER_ROLES_K.includes(user?.title ?? "");

  const [filterDistrict, setFilterDistrict] = useState<number | "">(_savedFilters?.district ?? "");
  const [filterCluster, setFilterCluster] = useState<number | "">(_savedFilters?.cluster ?? "");

  const { data: kutirs = [], isLoading } = useQuery({ queryKey: ["kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],     queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });

  const areaMap    = new Map(allAreas.map((a: any) => [a.id, a]));
  const clusterMap = new Map(allClusters.map((c: any) => [c.id, c]));

  // Scope districts/clusters to the user's assigned scope for non-admin roles
  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter((d: any) => user.district_ids.includes(d.id));
  const scopedClusters = isAdmin || !user
    ? allClusters
    : user.cluster_ids.length > 0
      ? allClusters.filter((c: any) => user.cluster_ids.includes(c.id))
      : allClusters;

  const filterClusters = scopedClusters.filter((c: any) => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);

  // Auto-select when scoped user has only one option available
  useEffect(() => {
    if (scopedDistricts.length === 1 && filterDistrict === "") setFilterDistrict(scopedDistricts[0].id);
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filterClusters.length === 1 && filterCluster === "") setFilterCluster(filterClusters[0].id);
  }, [filterClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = kutirs.filter(k => {
    if (filterCluster !== "" && k.cluster_id !== filterCluster) return false;
    if (filterDistrict !== "" && filterCluster === "") {
      const cl = clusterMap.get(k.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get((cl as any).area_id);
      if (!ar || (ar as any).district_id !== filterDistrict) return false;
    }
    return true;
  });

  const deleteMut = useMutation({
    mutationFn: deleteKutir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kutirs"] }),
  });

  function saveFilters() {
    sessionStorage.setItem("kutirs_filter_state", JSON.stringify({
      district: filterDistrict, cluster: filterCluster,
    }));
  }

  type KutirRow = typeof displayed[0];

  const allColumns: Col<KutirRow>[] = [
    { key: "name", label: "Name", sortable: true,
      render: r => <Link to={`/kutirs/${r.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{r.name}</Link>,
      csvValue: r => r.name },
    { key: "kutir_type", label: "Type", sortable: true },
    { key: "cluster_id", label: "Cluster", sortable: true,
      sortValue: r => (clusterMap.get(r.cluster_id) as any)?.name ?? "",
      render: r => <span style={{ fontSize: "0.82rem" }}>{(clusterMap.get(r.cluster_id) as any)?.name ?? "—"}</span>,
      csvValue: r => (clusterMap.get(r.cluster_id) as any)?.name ?? "" },
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
        filters={<>
          <select style={grs.filterSelect} value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}>
            <option value="">All Districts</option>
            {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select style={grs.filterSelect} value={filterCluster}
            onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={filterDistrict === ""}>
            <option value="">All Clusters</option>
            {filterClusters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>}
        exportFilename="kutirs"
        printTitle="Kutirs"
        onAdd={canManageKutirs ? () => navigate("/kutirs/new") : undefined}
        actions={r => ({
          onView: () => { saveFilters(); navigate(`/kutirs/${r.id}`); },
          ...(canManageKutirs ? {
            onEdit: () => { saveFilters(); navigate(`/kutirs/${r.id}?edit=1`); },
            onDelete: () => { if (confirm(`Delete kutir "${r.name}"?`)) deleteMut.mutate(r.id); },
          } : {}),
        })}
      />
    </div>
  );
}
