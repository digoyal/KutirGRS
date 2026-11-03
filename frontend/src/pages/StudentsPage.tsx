import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudentsPaged, deleteStudent, type Student } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { GrsTable, type Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { STUDENTS_FIELDS, STUDENTS_FIELD_KEYS } from "../constants/studentsFields";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
  countActiveFilters,
} from "../utils/geoFilters";
import { hasGlobalDataScope } from "../constants/roles";
import { displayPhone } from "../utils/displayPhone";
import { useEntityOfflineList, useEntityOfflinePendingCount } from "../hooks/useEntityOfflineList";
import {
  listPendingStudents,
  listStudentDrafts,
  purgeExpiredStudentDrafts,
  removePendingStudent,
  removeStudentDraft,
  STUDENT_OFFLINE_CHANGED,
  countPendingStudents,
} from "../offline/studentOfflineDb";
import {
  isOfflineLocalStudent,
  isOfflineStudentDraft,
  isOfflineStudentPending,
  offlineStudentDraftRowKey,
  offlineStudentPendingRowKey,
  pendingStudentToListItem,
  studentOfflineDisplayName,
  type OfflineStudentDraftListItem,
  type OfflineStudentPendingListItem,
  type StudentTableRow,
} from "../offline/studentDraftTypes";
import { offlineDraftPlaceholder, offlineSyncBadge } from "../offline/offlineUi";

const STORAGE_KEY = "students_filter_state";

type EnrichedStudent = Student & { docsCount: number; addedDate: string };
type StudentListRow = StudentTableRow & Partial<EnrichedStudent>;

type KutirLike = { id: number; name: string };

/** Cell/export/sort helpers keyed by STUDENTS_FIELDS.key — labels/order/visibility come from the registry. */
type StudentColRenderer = {
  render?: (s: StudentListRow) => ReactNode;
  csvValue?: (s: StudentListRow) => string;
  sortValue?: (s: StudentListRow) => string | number;
};

function docCount(s: Student) {
  return [s.aadhaar, s.category_cert, s.birth_cert, s.residence_proof, s.medical].filter(Boolean).length;
}

function studentColRenderers(kutirMap: Map<number, KutirLike>): Record<string, StudentColRenderer> {
  function kutirIdForRow(s: StudentListRow): number | null {
    if (isOfflineStudentDraft(s)) return s.kutir_id;
    if (isOfflineStudentPending(s)) return s.payload.kutir_id ?? null;
    return s.kutir_id ?? null;
  }

  const renderers: Record<string, StudentColRenderer> = {
    name: {
      render: (s) => {
        const label = isOfflineLocalStudent(s)
          ? studentOfflineDisplayName(s)
          : `${s.first_name} ${s.last_name}`;
        if (isOfflineStudentDraft(s)) {
          return (
            <>
              <span style={{ fontWeight: 600 }}>{label}</span>
              {offlineSyncBadge("draft")}
            </>
          );
        }
        if (isOfflineStudentPending(s)) {
          return (
            <>
              <span style={{ fontWeight: 600 }}>{label}</span>
              {offlineSyncBadge("pending")}
            </>
          );
        }
        return (
          <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
            {label}
          </Link>
        );
      },
      csvValue: (s) => {
        const label = isOfflineLocalStudent(s)
          ? studentOfflineDisplayName(s)
          : `${s.first_name} ${s.last_name}`;
        if (isOfflineStudentPending(s)) return `${label} (Waiting to sync)`;
        if (isOfflineStudentDraft(s)) return `${label} (Saved for offline)`;
        return label;
      },
      sortValue: (s) =>
        (isOfflineLocalStudent(s) ? studentOfflineDisplayName(s) : `${s.first_name} ${s.last_name}`).toLowerCase(),
    },
    gender: {},
    phone: {
      render: (s) => {
        const p = displayPhone(s.phone);
        return p || "—";
      },
      csvValue: (s) => displayPhone(s.phone),
    },
    father_name: {
      render: (s) => s.father_name ?? "—",
      csvValue: (s) => s.father_name ?? "",
    },
    mother_name: {
      render: (s) => s.mother_name ?? "—",
      csvValue: (s) => s.mother_name ?? "",
    },
    docsCount: {
      render: (s) => (
        <span style={{
          ...grs.badge,
          background: s.docsCount === 5 ? "var(--status-success-bg)" : "var(--badge-yellow-bg)",
          color: "var(--text-primary)",
        }}>
          {s.docsCount}/5
        </span>
      ),
      csvValue: (s) => `${s.docsCount}/5`,
    },
    addedDate: {
      csvValue: (s) => s.addedDate ?? "",
    },
    kutir_id: {
      sortValue: (s) => {
        const kid = kutirIdForRow(s);
        return kid != null ? (kutirMap.get(kid)?.name ?? "") : "";
      },
      render: (s) => {
        const kid = kutirIdForRow(s);
        if (isOfflineLocalStudent(s) && kid == null) return offlineDraftPlaceholder;
        return kid != null
          ? <span style={{ fontSize: "0.82rem" }}>{kutirMap.get(kid)?.name ?? "—"}</span>
          : <span style={{ color: "var(--text-secondary)" }}>—</span>;
      },
      csvValue: (s) => {
        const kid = kutirIdForRow(s);
        return kid != null ? (kutirMap.get(kid)?.name ?? "") : "";
      },
    },
    dob: {
      render: (s) => s.dob
        ? new Date(s.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.dob ?? "",
    },
    email: {
      render: (s) => s.email ?? <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.email ?? "",
    },
    alt_contact_name: {
      render: (s) => s.alt_contact_name ?? <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.alt_contact_name ?? "",
    },
    alt_contact_phone: {
      render: (s) => {
        const p = displayPhone(s.alt_contact_phone);
        return p || <span style={{ color: "var(--text-secondary)" }}>—</span>;
      },
      csvValue: (s) => displayPhone(s.alt_contact_phone),
    },
  };
  if (import.meta.env.DEV) {
    for (const key of STUDENTS_FIELD_KEYS) {
      if (!(key in renderers)) {
        throw new Error(`StudentsPage missing renderer for STUDENTS_FIELDS key: ${key}`);
      }
    }
  }
  return renderers;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const unscoped = hasGlobalDataScope(user?.title);
  const navigate = useNavigate();
  const location = useLocation();
  const pendingOfflineCount = useEntityOfflinePendingCount(countPendingStudents, STUDENT_OFFLINE_CHANGED);
  const offlinePending = useEntityOfflineList(listPendingStudents, STUDENT_OFFLINE_CHANGED);
  const offlineDrafts = useEntityOfflineList(listStudentDrafts, STUDENT_OFFLINE_CHANGED);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "student"; id: number; name: string }
    | { kind: "draft"; localId: string; name: string }
    | { kind: "pending"; localId: string; name: string }
    | null
  >(null);

  useBfcacheReload();

  useEffect(() => {
    void purgeExpiredStudentDrafts();
  }, []);

  useEffect(() => {
    const st = location.state as { offlineQueued?: boolean; offlineMessage?: string } | null;
    if (st?.offlineQueued && st.offlineMessage) {
      setOfflineNotice(st.offlineMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const saved = usePersistedFilterRestore<{
    district?: FilterId;
    cluster?: FilterId;
    kutir?: FilterId;
    search?: string;
    page?: number;
  }>(STORAGE_KEY);

  const defaults = defaultsFromUser(user);
  const defaultDistrict = defaults.district;
  const defaultCluster = defaults.cluster;
  const defaultKutir = defaults.kutir;

  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? defaultDistrict);
  const [filterCluster, setFilterCluster] = useState<FilterId>(saved?.cluster ?? defaultCluster);
  const [filterKutir, setFilterKutir] = useState<FilterId>(saved?.kutir ?? defaultKutir);
  const [searchQuery, setSearchQuery] = useState(saved?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(saved?.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(saved?.page ?? 1);
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };

  const { data: studentsPage, isLoading } = useQuery({
    queryKey: ["students", filterDistrict, filterCluster, filterKutir, debouncedSearch, page],
    queryFn: () => listStudentsPaged({
      kutir_id: filterKutir !== "" ? filterKutir : undefined,
      cluster_id: filterKutir !== "" ? undefined : (filterCluster !== "" ? filterCluster : undefined),
      district_id: filterKutir !== "" || filterCluster !== "" ? undefined : (filterDistrict !== "" ? filterDistrict : undefined),
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  });
  const students = studentsPage?.items ?? [];
  const studentTotal = studentsPage?.total ?? 0;

  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const kutirMap = useMemo(() => new Map(allKutirs.map(k => [k.id, k])), [allKutirs]);
  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedClusters = scopeClusters(allClusters, user, unscoped);
  const scopedKutirs = scopeKutirs(allKutirs, user, unscoped);

  useGeoFilterAutoSelect({
    scopedDistricts,
    scopedClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    unscoped,
    clusterMode: "scoped-non-admin",
  });

  const scopedKutirIds = useMemo(() => {
    if (unscoped) return null;
    return new Set(scopedKutirs.map((k) => k.id));
  }, [unscoped, scopedKutirs]);

  function passesGeoFilters(kutirId: number | null): boolean {
    if (kutirId == null) return filterKutir === "";
    if (filterKutir !== "" && kutirId !== Number(filterKutir)) return false;
    if (scopedKutirIds !== null && !scopedKutirIds.has(kutirId)) return false;
    const kutir = kutirMap.get(kutirId);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = allClusters.find((c) => c.id === kutir.cluster_id);
      if (!cl) return false;
      const ar = allAreas.find((a) => a.id === (cl as { area_id: number }).area_id);
      if (!ar || (ar as { district_id: number }).district_id !== filterDistrict) return false;
    }
    return true;
  }

  const draftListItems = useMemo((): OfflineStudentDraftListItem[] => {
    return offlineDrafts
      .filter((d) => passesGeoFilters(d.kutir_id))
      .map((d) => ({ ...d, kind: "offline-draft" as const }));
  }, [offlineDrafts, filterKutir, filterCluster, filterDistrict, kutirMap, allClusters, allAreas, scopedKutirIds]);

  const pendingListItems = useMemo((): OfflineStudentPendingListItem[] => {
    return offlinePending
      .filter((p) => passesGeoFilters(p.payload.kutir_id ?? null))
      .map(pendingStudentToListItem);
  }, [offlinePending, filterKutir, filterCluster, filterDistrict, kutirMap, allClusters, allAreas, scopedKutirIds]);

  const enriched: StudentListRow[] = useMemo(() => {
    const serverRows: EnrichedStudent[] = students.map((s) => ({
      ...s,
      docsCount: docCount(s),
      addedDate: new Date(s.created_at).toLocaleDateString("en-IN"),
    }));
    const offlineRows: StudentListRow[] = [
      ...draftListItems.map((d) => ({
        ...d,
        docsCount: 0,
        addedDate: new Date(d.createdAt).toLocaleDateString("en-IN"),
      })),
      ...pendingListItems.map((p) => ({
        ...p,
        docsCount: 0,
        addedDate: new Date(p.createdAt).toLocaleDateString("en-IN"),
      })),
    ];
    return [...serverRows, ...offlineRows];
  }, [students, draftListItems, pendingListItems]);

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  function saveFilters() {
    persistFilters(STORAGE_KEY, {
      district: filterDistrict, cluster: filterCluster,
      kutir: filterKutir, search: searchQuery, page,
    });
  }

  // List columns, labels, visibility, order, and CSV headers all come from STUDENTS_FIELDS.
  const { isVisible, orderedMetas } = useFieldConfig("students", STUDENTS_FIELDS);
  const columns = useMemo<Col<StudentListRow>[]>(() => {
    const renderers = studentColRenderers(kutirMap);
    return orderedMetas
      .filter((m) => isVisible(m.key))
      .map((meta): Col<StudentListRow> => {
        const r = renderers[meta.key] ?? {};
        return {
          key: meta.key,
          label: meta.label,
          sortable: true,
          render: r.render,
          csvValue: r.csvValue,
          sortValue: r.sortValue,
        };
      });
  }, [orderedMetas, isVisible, kutirMap]);

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: 14,
    flexShrink: 0,
  };

  const geoFilters = (
    <GeoFilterBar
      district={filterDistrict}
      cluster={filterCluster}
      kutir={filterKutir}
      onChange={({ district, cluster, kutir }) => {
        setFilterDistrict(district);
        setFilterCluster(cluster);
        setFilterKutir(kutir);
        setPage(1);
      }}
      districts={scopedDistricts}
      clusters={scopedClusters}
      areas={allAreas}
      kutirs={scopedKutirs}
      kutirMode="by-cluster"
      clusterDisable="no-district-unless-default-cluster"
      kutirDisable="no-cluster-unless-default-kutir"
      defaultCluster={defaultCluster}
      defaultKutir={defaultKutir}
      selectStyle={filterSelectStyle}
      districtStyle={{ width: 140 }}
      clusterStyle={{ width: 140 }}
      kutirStyle={{ width: 130 }}
    />
  );

  const tableSubtitle =
    pendingOfflineCount > 0
      ? `${pendingOfflineCount} student${pendingOfflineCount === 1 ? "" : "s"} waiting to upload`
      : undefined;

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {offlineNotice && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--status-success-bg)",
            color: "var(--status-success-fg)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>{offlineNotice}</span>
          <button type="button" onClick={() => setOfflineNotice(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}
      <GrsTable
        title="Students"
        subtitle={tableSubtitle}
        columns={columns}
        data={enriched}
        rowKey={(s) => {
          if (isOfflineStudentDraft(s)) return offlineStudentDraftRowKey(s);
          if (isOfflineStudentPending(s)) return offlineStudentPendingRowKey(s);
          return String((s as EnrichedStudent).id);
        }}
        isLoading={isLoading}
        emptyMessage="No students found."
        pagination={{ page, pageSize: PAGE_SIZE, total: studentTotal, onPageChange: setPage }}
        actions={(s) => {
          if (isOfflineStudentDraft(s)) {
            const name = studentOfflineDisplayName(s);
            return {
              onView: () => { saveFilters(); navigate(`draft/${s.localId}`); },
              onEdit: () => { saveFilters(); navigate(`draft/${s.localId}`); },
              onDelete: () => setPendingDelete({ kind: "draft", localId: s.localId, name }),
            };
          }
          if (isOfflineStudentPending(s)) {
            const name = studentOfflineDisplayName(s);
            return {
              onDelete: () => setPendingDelete({ kind: "pending", localId: s.localId, name }),
            };
          }
          return {
            onView: () => { saveFilters(); navigate(`/students/${s.id}`); },
            onEdit: () => {
              saveFilters();
              navigate(`/students/${s.id}?edit=1`);
            },
            onDelete: () =>
              setPendingDelete({
                kind: "student",
                id: s.id!,
                name: `${s.first_name} ${s.last_name}`,
              }),
          };
        }}
        searchable
        searchPlaceholder="Search by name, phone…"
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        filters={geoFilters}
        activeFilterCount={countActiveFilters(filterDistrict, filterCluster, filterKutir)}
        exportFilename="students"
        printTitle="Students"
        onAdd={() => { saveFilters(); navigate("new"); }}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={
            pendingDelete.kind === "draft"
              ? <>Remove saved offline student <strong>{pendingDelete.name}</strong>?</>
              : pendingDelete.kind === "pending"
                ? <>Remove student waiting to sync: <strong>{pendingDelete.name}</strong>?</>
                : <>Delete <strong>{pendingDelete.name}</strong>?</>
          }
          onConfirm={() => {
            if (pendingDelete.kind === "draft") {
              void removeStudentDraft(pendingDelete.localId);
            } else if (pendingDelete.kind === "pending") {
              void removePendingStudent(pendingDelete.localId);
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
