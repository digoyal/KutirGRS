import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useRef } from "react";
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
import { STUDENTS_FIELDS } from "../constants/studentsFields";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
} from "../utils/geoFilters";

const STORAGE_KEY = "students_filter_state";

type EnrichedStudent = Student & { docsCount: number; addedDate: string };

function docCount(s: Student) {
  return [s.aadhaar, s.category_cert, s.birth_cert, s.residence_proof, s.medical].filter(Boolean).length;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.title === "Admin";
  const navigate = useNavigate();

  useBfcacheReload();

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
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };

  const hasFilter = filterDistrict !== "" || filterCluster !== "" || filterKutir !== "" || debouncedSearch !== "";
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
    enabled: hasFilter,
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

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const scopedDistricts = scopeDistricts(allDistricts, user, isAdmin);
  const scopedClusters = scopeClusters(allClusters, user, isAdmin);
  const scopedKutirs = scopeKutirs(allKutirs, user, isAdmin);

  useGeoFilterAutoSelect({
    scopedDistricts,
    scopedClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    isAdmin,
    clusterMode: "scoped-non-admin",
  });

  const enriched: EnrichedStudent[] = students.map(s => ({
    ...s,
    docsCount: docCount(s),
    addedDate: new Date(s.created_at).toLocaleDateString("en-IN"),
  }));

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

  const allColumns: Col<EnrichedStudent>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (s) => (
        <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
          {s.first_name} {s.last_name}
        </Link>
      ),
      csvValue: (s) => `${s.first_name} ${s.last_name}`,
    },
    { key: "gender", label: "Gender", sortable: true },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      render: (s) => s.phone ?? "—",
      csvValue: (s) => s.phone ?? "",
    },
    {
      key: "father_name",
      label: "Father",
      sortable: true,
      render: (s) => s.father_name ?? "—",
      csvValue: (s) => s.father_name ?? "",
    },
    {
      key: "mother_name",
      label: "Mother",
      sortable: true,
      render: (s) => s.mother_name ?? "—",
      csvValue: (s) => s.mother_name ?? "",
    },
    {
      key: "docsCount",
      label: "Docs",
      sortable: true,
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
    {
      key: "addedDate",
      label: "Added",
      sortable: true,
      csvValue: (s) => s.addedDate,
    },
    {
      key: "kutir_id",
      label: "Kutir",
      sortable: true,
      sortValue: (s) => s.kutir_id != null ? (kutirMap.get(s.kutir_id)?.name ?? "") : "",
      render: (s) => s.kutir_id != null ? <span style={{ fontSize: "0.82rem" }}>{kutirMap.get(s.kutir_id)?.name ?? "—"}</span> : <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.kutir_id != null ? (kutirMap.get(s.kutir_id)?.name ?? "") : "",
    },
    {
      key: "dob",
      label: "Date of Birth",
      sortable: true,
      render: (s) => s.dob ? new Date(s.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.dob ?? "",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (s) => s.email ?? <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.email ?? "",
    },
    {
      key: "alt_contact_name",
      label: "Alt Contact",
      sortable: true,
      render: (s) => s.alt_contact_name ?? <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.alt_contact_name ?? "",
    },
    {
      key: "alt_contact_phone",
      label: "Alt Phone",
      sortable: true,
      render: (s) => s.alt_contact_phone ?? <span style={{ color: "var(--text-secondary)" }}>—</span>,
      csvValue: (s) => s.alt_contact_phone ?? "",
    },
  ];

  const { isVisible, orderedMetas } = useFieldConfig("students", STUDENTS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

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
    />
  );

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Students"
        columns={columns}
        data={enriched}
        rowKey={s => s.id}
        isLoading={isLoading}
        emptyMessage={hasFilter ? "No students found." : "Select a district or search by name to view students."}
        pagination={hasFilter ? { page, pageSize: PAGE_SIZE, total: studentTotal, onPageChange: setPage } : undefined}
        actions={s => ({
          onView: () => { saveFilters(); navigate(`/students/${s.id}`); },
          onEdit: () => {
            saveFilters();
            navigate(`/students/${s.id}?edit=1`);
          },
          onDelete: () => setPendingDelete({ id: s.id, name: `${s.first_name} ${s.last_name}` }),
        })}
        searchable
        searchPlaceholder="Search by name, phone…"
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        filters={geoFilters}
        exportFilename="students"
        printTitle="Students"
        onAdd={() => { saveFilters(); navigate("new"); }}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={<>Delete <strong>{pendingDelete.name}</strong>?</>}
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
