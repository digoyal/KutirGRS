import { useState, useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, deleteKutir, type Kutir } from "../api/kutirs";
import { listDonors } from "../api/donors";
import { useAuth } from "../context/AuthContext";
import { listClusters, listAreas, listDistricts } from "../api/geo";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { KUTIRS_FIELDS, KUTIRS_FIELD_KEYS } from "../constants/kutirsFields";
import { canManageKutirs as roleCanManageKutirs, hasGlobalDataScope } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  clustersForDistrict,
  scopeClusters,
  scopeDistricts,
  type FilterId,
} from "../utils/geoFilters";

const STORAGE_KEY = "kutirs_filter_state";

type KutirColRenderer = {
  render?: (r: Kutir) => ReactNode;
  csvValue?: (r: Kutir) => string;
  sortValue?: (r: Kutir) => string | number;
  sortable?: boolean;
};

function teacherLabel(t: { first_name?: string | null; last_name?: string | null; username: string }) {
  return [t.first_name, t.last_name].filter(Boolean).join(" ") || t.username;
}

function kutirColRenderers(
  clusterMap: Map<number, { id: number; name: string }>,
  donorMap: Map<number, { id: number; name: string }>,
): Record<string, KutirColRenderer> {
  const renderers: Record<string, KutirColRenderer> = {
    name: {
      sortable: true,
      render: (r) => (
        <Link to={`/kutirs/${r.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
          {r.name}
        </Link>
      ),
      csvValue: (r) => r.name,
    },
    kutir_type: { sortable: true },
    cluster_id: {
      sortable: true,
      sortValue: (r) => clusterMap.get(r.cluster_id)?.name ?? "",
      render: (r) => (
        <span style={{ fontSize: "0.82rem" }}>{clusterMap.get(r.cluster_id)?.name ?? "—"}</span>
      ),
      csvValue: (r) => clusterMap.get(r.cluster_id)?.name ?? "",
    },
    street: {
      sortable: false,
      render: (r) => r.street ?? "—",
      csvValue: (r) => r.street ?? "",
    },
    state: { sortable: true },
    pincode: {
      sortable: true,
      render: (r) => r.pincode ?? "—",
      csvValue: (r) => r.pincode ?? "",
    },
    donor_id: {
      sortable: true,
      sortValue: (r) => (r.donor_id != null ? donorMap.get(r.donor_id)?.name ?? "" : ""),
      render: (r) => (
        <span style={{ fontSize: "0.82rem" }}>
          {r.donor_id != null ? donorMap.get(r.donor_id)?.name ?? "—" : "—"}
        </span>
      ),
      csvValue: (r) => (r.donor_id != null ? donorMap.get(r.donor_id)?.name ?? "" : ""),
    },
    enrollment_5th: {
      sortable: true,
      render: (r) => r.enrollment_5th ?? "—",
      csvValue: (r) => String(r.enrollment_5th ?? ""),
    },
    enrollment_8th: {
      sortable: true,
      render: (r) => r.enrollment_8th ?? "—",
      csvValue: (r) => String(r.enrollment_8th ?? ""),
    },
    teachers: {
      sortable: true,
      sortValue: (r) => r.teachers?.length ?? 0,
      render: (r) => {
        const list = r.teachers;
        if (!list?.length) return "—";
        return (
          <span style={{ fontSize: "0.82rem" }}>
            {list.map(teacherLabel).join(", ")}
          </span>
        );
      },
      csvValue: (r) => (r.teachers ?? []).map(teacherLabel).join("; "),
    },
  };
  if (import.meta.env.DEV) {
    for (const key of KUTIRS_FIELD_KEYS) {
      if (!(key in renderers)) {
        throw new Error(`KutirsPage missing renderer for KUTIRS_FIELDS key: ${key}`);
      }
    }
  }
  return renderers;
}

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
  const { data: donors = [] } = useQuery({ queryKey: ["donors"], queryFn: listDonors });

  const areaMap    = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map((c) => [c.id, c])), [allClusters]);
  const donorMap   = useMemo(() => new Map(donors.map((d) => [d.id, d])), [donors]);

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

  // List columns, labels, visibility, order, and CSV headers all come from KUTIRS_FIELDS.
  const { isVisible, orderedMetas } = useFieldConfig("kutirs", KUTIRS_FIELDS);
  const columns = useMemo<Col<Kutir>[]>(() => {
    const renderers = kutirColRenderers(clusterMap, donorMap);
    return orderedMetas
      .filter((m) => isVisible(m.key))
      .map((meta): Col<Kutir> => {
        const r = renderers[meta.key] ?? {};
        return {
          key: meta.key,
          label: meta.label,
          sortable: r.sortable ?? true,
          render: r.render,
          csvValue: r.csvValue,
          sortValue: r.sortValue,
        };
      });
  }, [orderedMetas, isVisible, clusterMap, donorMap]);

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
