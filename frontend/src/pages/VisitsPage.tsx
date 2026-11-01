import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { listVisits, deleteVisit } from "../api/visits";
import { listKutirs, type Kutir } from "../api/kutirs";
import type { KutirVisit } from "../api/visits";
import { useAuth } from "../context/AuthContext";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { VISITS_FIELDS, VISITS_FIELD_KEYS } from "../constants/visitsFields";
import { canManageVisits as roleCanManageVisits, hasGlobalDataScope } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { countActiveFilters, scopeClusters, scopeDistricts, type FilterId } from "../utils/geoFilters";
import { useVisitOfflinePendingCount } from "../hooks/useVisitOfflinePendingCount";
import { useVisitOfflinePending } from "../hooks/useVisitOfflinePending";
import { useVisitOfflineDrafts } from "../hooks/useVisitOfflineDrafts";
import { removePendingVisit, removeVisitDraft } from "../offline/visitOfflineDb";
import {
  isOfflineLocalVisit,
  isOfflineVisitDraft,
  isOfflineVisitPending,
  offlineDraftRowKey,
  offlinePendingRowKey,
  pendingRecordToListItem,
  type OfflineVisitDraftListItem,
  type OfflineVisitPendingListItem,
  type VisitTableRow,
} from "../offline/visitDraftTypes";

import { mediaBase } from "../api/apiBase";

const MEDIA_BASE = mediaBase();
const STORAGE_KEY = "visits_filter_state";

function StarRating({ value, readOnly }: { value: number; readOnly?: boolean; }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: "1.2rem", cursor: readOnly ? "default" : "pointer", color: n <= value ? "var(--star-active)" : "var(--star-inactive)" }}>★</span>
      ))}
    </span>
  );
}

function workbookColor(wc: string | null) {
  if (wc === "Upto Date") return "var(--status-success-fg)";
  if (wc === "Partial Upto Date") return "var(--status-warn-fg)";
  return "var(--status-danger-fg)";
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VisitsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingOfflineCount = useVisitOfflinePendingCount();
  const offlinePending = useVisitOfflinePending();
  const offlineDrafts = useVisitOfflineDrafts();
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  useEffect(() => {
    const st = location.state as { offlineVisitQueued?: boolean; offlineVisitMessage?: string } | null;
    if (st?.offlineVisitQueued && st.offlineVisitMessage) {
      setOfflineNotice(st.offlineVisitMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);
  const unscoped = hasGlobalDataScope(user?.title);
  const canManageVisits = roleCanManageVisits(user?.title);

  useBfcacheReload();
  const qc = useQueryClient();

  const saved = usePersistedFilterRestore<{
    district?: FilterId;
    cluster?: FilterId;
    kutir?: FilterId;
  }>(STORAGE_KEY);
  const [filterKutir, setFilterKutir]   = useState<FilterId>(saved?.kutir ?? "");
  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? "");
  const [filterCluster, setFilterCluster]   = useState<FilterId>(saved?.cluster ?? "");
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "visit"; id: number; label: string }
    | { kind: "draft"; localId: string; label: string }
    | { kind: "pending"; localId: string; label: string }
    | null
  >(null);

  function saveFilters() {
    persistFilters(STORAGE_KEY, { district: filterDistrict, cluster: filterCluster, kutir: filterKutir });
  }

  const { data: kutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
  });
  const kutirMap = useMemo(() => new Map(kutirs.map((k) => [k.id, k])), [kutirs]);

  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],    queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap    = useMemo(() => new Map(allAreas.map(a => [a.id, a])),    [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map(c => [c.id, c])), [allClusters]);

  // For Teachers, restrict visible kutirs to their assigned ones
  const isTeacher = user?.title === "Teacher";
  const scopedKutirIds = useMemo(() => {
    if (!isTeacher || !user) return null;
    return new Set(user.kutir_ids ?? []);
  }, [isTeacher, user]);

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedClusters = scopeClusters(allClusters, user, unscoped);

  useGeoFilterAutoSelect({
    scopedDistricts,
    scopedClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    unscoped,
    clusterMode: "scoped-non-admin",
    skipDistrictAuto: saved?.district != null,
    skipClusterAuto: saved?.cluster != null,
  });

  const { data: visits = [], isLoading } = useQuery<KutirVisit[]>({
    queryKey: ["visits", filterKutir],
    queryFn: () => listVisits(filterKutir ? { kutir_id: Number(filterKutir) } : {}),
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["visits"] }); }

  const deleteMut = useMutation({
    mutationFn: deleteVisit,
    onSuccess: refresh,
  });

  const filteredVisits = useMemo(() => visits.filter(v => {
    if (scopedKutirIds !== null && !scopedKutirIds.has(v.kutir_id)) return false;
    const kutir = kutirMap.get(v.kutir_id);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = clusterMap.get(kutir.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get((cl as any).area_id);
      if (!ar || (ar as any).district_id !== filterDistrict) return false;
    }
    return true;
  }), [visits, filterKutir, filterCluster, filterDistrict, kutirMap, clusterMap, areaMap, scopedKutirIds]);

  function passesGeoFilters(kutirId: number): boolean {
    if (filterKutir !== "" && kutirId !== Number(filterKutir)) return false;
    if (scopedKutirIds !== null && !scopedKutirIds.has(kutirId)) return false;
    const kutir = kutirMap.get(kutirId);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = clusterMap.get(kutir.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get((cl as any).area_id);
      if (!ar || (ar as any).district_id !== filterDistrict) return false;
    }
    return true;
  }

  const draftListItems = useMemo((): OfflineVisitDraftListItem[] => {
    return offlineDrafts
      .filter((d) => passesGeoFilters(d.kutir_id))
      .map((d) => ({ ...d, kind: "offline-draft" as const }));
  }, [offlineDrafts, filterKutir, filterCluster, filterDistrict, kutirMap, clusterMap, areaMap, scopedKutirIds]);

  const pendingListItems = useMemo((): OfflineVisitPendingListItem[] => {
    return offlinePending
      .filter((p) => passesGeoFilters(p.payload.kutir_id))
      .map(pendingRecordToListItem);
  }, [offlinePending, filterKutir, filterCluster, filterDistrict, kutirMap, clusterMap, areaMap, scopedKutirIds]);

  const data = useMemo((): VisitTableRow[] => {
    const rows: VisitTableRow[] = [...filteredVisits, ...draftListItems, ...pendingListItems];
    return rows.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
  }, [filteredVisits, draftListItems, pendingListItems]);

  function offlineRowBadge(label: string, fg = "var(--badge-blue-fg)", bg = "var(--badge-blue-bg)") {
    return (
      <span
        style={{
          marginLeft: 8,
          fontSize: "0.72rem",
          fontWeight: 600,
          background: bg,
          color: fg,
          borderRadius: 4,
          padding: "2px 6px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    );
  }

  function offlineListBadge(v: VisitTableRow) {
    if (isOfflineVisitPending(v)) {
      return offlineRowBadge("Waiting to sync", "var(--status-warn-fg)", "var(--status-warn-bg)");
    }
    if (isOfflineVisitDraft(v)) {
      return offlineRowBadge("Saved for offline");
    }
    return null;
  }

  const draftPlaceholder = (
    <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>—</span>
  );

  // Labels come from VISITS_FIELDS via orderedMetas; renderers are keyed only.
  const allColumns = useMemo<Col<VisitTableRow>[]>(() => [
    {
      key: "visit_date",
      label: "",
      sortable: true,
      render: v => new Date(v.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    },
    {
      key: "kutir_id",
      label: "",
      sortable: true,
      sortValue: v => kutirMap.get(v.kutir_id)?.name ?? "",
      csvValue: v => {
        const name = kutirMap.get(v.kutir_id)?.name ?? String(v.kutir_id);
        if (isOfflineVisitPending(v)) return `${name} (Waiting to sync)`;
        if (isOfflineVisitDraft(v)) return `${name} (Saved for offline)`;
        return name;
      },
      render: v => {
        const kutir = kutirMap.get(v.kutir_id);
        return (
          <>
            <span style={{ fontWeight: 600, color: "var(--badge-blue-fg)" }}>{kutir?.name ?? `#${v.kutir_id}`}</span>
            {offlineListBadge(v)}
          </>
        );
      },
    },
    {
      key: "avg_attendance_morning" as keyof KutirVisit,
      label: "",
      sortable: false,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span>{v.avg_attendance_morning ?? "—"} / {v.avg_attendance_evening ?? "—"}</span>
      )),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : `${v.avg_attendance_morning ?? ""}/${v.avg_attendance_evening ?? ""}`),
    },
    {
      key: "regular_students_morning" as keyof KutirVisit,
      label: "",
      sortable: false,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span>{v.regular_students_morning ?? "—"} / {v.regular_students_evening ?? "—"}</span>
      )),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : `${v.regular_students_morning ?? ""}/${v.regular_students_evening ?? ""}`),
    },
    {
      key: "physical_vs_registered",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span style={{ background: v.physical_vs_registered === "Matched" ? "var(--status-success-bg)" : "var(--status-danger-bg)", color: v.physical_vs_registered === "Matched" ? "var(--status-success-fg)" : "var(--status-danger-fg)", borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem" }}>
          {v.physical_vs_registered}
        </span>
      )),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : v.physical_vs_registered),
    },
    {
      key: "follow_timetable",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span style={{ color: v.follow_timetable ? "var(--status-success-fg)" : "var(--status-danger-fg)" }}>{v.follow_timetable ? "✓ Yes" : "✗ No"}</span>
      )),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : v.follow_timetable ? "Yes" : "No"),
    },
    {
      key: "workbook_percentage",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <>
          <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{v.workbook_percentage}%</span>
          <span style={{ marginLeft: 6, fontSize: "0.75rem", color: workbookColor(v.workbook_completion) }}>
            {v.workbook_completion === "Upto Date" ? "✓" : v.workbook_completion === "Partial Upto Date" ? "~" : "✗"}
          </span>
        </>
      )),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : `${v.workbook_percentage}% (${v.workbook_completion ?? ""})`),
    },
    {
      key: "workbook_completion",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : v.workbook_completion),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : v.workbook_completion),
    },
    {
      key: "book_availability",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : v.book_availability),
      csvValue: v => (isOfflineLocalVisit(v) ? "" : v.book_availability),
    },
    {
      key: "kutir_performance",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.kutir_performance} readOnly />),
    },
    {
      key: "staff_behavior",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.staff_behavior} readOnly />),
    },
    {
      key: "cleanliness",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.cleanliness} readOnly />),
    },
    {
      key: "hindi_proficiency",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.hindi_proficiency} readOnly />),
    },
    {
      key: "english_proficiency",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.english_proficiency} readOnly />),
    },
    {
      key: "maths_proficiency",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.maths_proficiency} readOnly />),
    },
    {
      key: "evs_proficiency",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.evs_proficiency} readOnly />),
    },
    {
      key: "reasoning_proficiency",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.reasoning_proficiency} readOnly />),
    },
    {
      key: "material_management",
      label: "",
      sortable: true,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : <StarRating value={v.material_management} readOnly />),
    },
    {
      key: "grs_prep_remarks",
      label: "",
      sortable: false,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{v.grs_prep_remarks ?? "—"}</span>
      )),
    },
    {
      key: "final_remarks",
      label: "",
      sortable: false,
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : (
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{v.final_remarks ?? "—"}</span>
      )),
    },
    {
      key: "visit_photo",
      label: "",
      csvValue: v => (isOfflineLocalVisit(v) || !v.visit_photo ? "" : `${MEDIA_BASE}/media/${v.visit_photo}`),
      render: v => (isOfflineLocalVisit(v) ? draftPlaceholder : v.visit_photo ? (
        <img src={`${MEDIA_BASE}/media/${v.visit_photo}`} alt="Visit photo" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 4, display: "block" }} />
      ) : (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>—</span>
      )),
    },
  ], [kutirMap]);

  const { isVisible, orderedMetas } = useFieldConfig("visits", VISITS_FIELDS);
  const columns = useMemo(() => {
    if (import.meta.env.DEV) {
      for (const key of VISITS_FIELD_KEYS) {
        if (!allColumns.some((c) => c.key === key)) {
          throw new Error(`VisitsPage missing renderer for VISITS_FIELDS key: ${key}`);
        }
      }
    }
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => {
        const col = colByKey.get(m.key);
        return col ? { ...col, label: m.label } : undefined;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  const subtitle =
    pendingOfflineCount > 0
      ? `Field visit records and observations · ${pendingOfflineCount} visit${pendingOfflineCount === 1 ? "" : "s"} waiting to upload`
      : "Field visit records and observations";

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {offlineNotice && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "var(--status-success-bg)",
            color: "var(--status-success-fg)",
            borderRadius: 8,
            fontSize: 14,
            border: "1px solid var(--border)",
          }}
        >
          {offlineNotice}
          <button
            type="button"
            onClick={() => setOfflineNotice(null)}
            style={{
              marginLeft: 12,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textDecoration: "underline",
              color: "inherit",
              fontSize: 13,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <GrsTable<VisitTableRow>
        title="Kutir Visits"
        subtitle={subtitle}
        columns={columns}
        data={data}
        rowKey={v => {
          if (isOfflineVisitDraft(v)) return offlineDraftRowKey(v);
          if (isOfflineVisitPending(v)) return offlinePendingRowKey(v);
          return String(v.id);
        }}
        isLoading={isLoading}
        emptyMessage="No visits recorded yet."
        searchable
        searchPlaceholder="Search by kutir name…"
        searchFn={(v, q) => {
          const name = kutirMap.get(v.kutir_id)?.name ?? "";
          const hint = isOfflineVisitPending(v)
            ? "waiting to sync"
            : isOfflineVisitDraft(v)
              ? "saved for offline"
              : "";
          return `${name} ${hint}`.toLowerCase().includes(q);
        }}
        activeFilterCount={countActiveFilters(filterDistrict, filterCluster, filterKutir)}
        filters={
          <GeoFilterBar
            district={filterDistrict}
            cluster={filterCluster}
            kutir={filterKutir}
            onChange={({ district, cluster, kutir }) => {
              setFilterDistrict(district);
              setFilterCluster(cluster);
              setFilterKutir(kutir);
            }}
            districts={scopedDistricts}
            clusters={scopedClusters}
            areas={allAreas}
            kutirs={kutirs}
            kutirMode="all"
            clusterDisable="no-district"
            kutirDisable="no-cluster"
            kutirVisibility="always"
          />
        }
        exportFilename="visits"
        printTitle="Kutir Visits"
        onAdd={canManageVisits ? () => { saveFilters(); navigate("new"); } : undefined}
        actions={canManageVisits
          ? (v => {
              if (isOfflineVisitDraft(v)) {
                const label = `${kutirMap.get(v.kutir_id)?.name ?? "this kutir"} on ${v.visit_date}`;
                return {
                  onView: () => { saveFilters(); navigate(`draft/${v.localId}`); },
                  onEdit: () => { saveFilters(); navigate(`draft/${v.localId}`); },
                  onDelete: () => setPendingDelete({ kind: "draft", localId: v.localId, label }),
                };
              }
              if (isOfflineVisitPending(v)) {
                const label = `${kutirMap.get(v.kutir_id)?.name ?? "this kutir"} on ${v.visit_date}`;
                return {
                  onDelete: () => setPendingDelete({ kind: "pending", localId: v.localId, label }),
                };
              }
              return {
                onView: () => { saveFilters(); navigate(String(v.id)); },
                onEdit: () => { saveFilters(); navigate(`${v.id}?edit=1`); },
                onDelete: () => setPendingDelete({
                  kind: "visit",
                  id: v.id,
                  label: `${kutirMap.get(v.kutir_id)?.name ?? "this kutir"} on ${v.visit_date}`,
                }),
              };
            })
          : (v => {
              if (isOfflineVisitPending(v)) return {};
              return {
                onView: () => {
                  saveFilters();
                  navigate(isOfflineVisitDraft(v) ? `draft/${v.localId}` : String(v.id));
                },
              };
            })
        }
      />
      {pendingDelete && (
        <ConfirmDialog
          message={
            pendingDelete.kind === "draft"
              ? <>Remove saved offline visit for <strong>{pendingDelete.label}</strong>?</>
              : pendingDelete.kind === "pending"
                ? <>Remove visit waiting to sync for <strong>{pendingDelete.label}</strong>?</>
                : <>Delete visit for <strong>{pendingDelete.label}</strong>?</>
          }
          onConfirm={() => {
            if (pendingDelete.kind === "draft") {
              void removeVisitDraft(pendingDelete.localId);
            } else if (pendingDelete.kind === "pending") {
              void removePendingVisit(pendingDelete.localId);
            } else {
              deleteMut.mutate(pendingDelete.id);
            }
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
