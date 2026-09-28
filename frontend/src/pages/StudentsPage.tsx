import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudentsPaged, deleteStudent, type Student } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { GrsTable, type Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { STUDENTS_FIELDS } from "../constants/studentsFields";

type EnrichedStudent = Student & { docsCount: number; addedDate: string };

function docCount(s: Student) {
  return [s.aadhaar, s.category_cert, s.birth_cert, s.residence_proof, s.medical].filter(Boolean).length;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.title === "Admin";
  const navigate = useNavigate();

  // Restore filter state saved before navigating to an edit/add page
  const _savedFilters = (() => {
    try {
      const s = sessionStorage.getItem("students_filter_state");
      if (s) { sessionStorage.removeItem("students_filter_state"); return JSON.parse(s); }
    } catch {}
    return null;
  })();

  useEffect(() => {
    if (window.location.search.includes("_=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Initialise geo filters from the logged-in user's role assignments
  const defaultDistrict: number | "" = (() => {
    if (!user) return "";
    if (user.title === "District Anchor" && user.district_ids.length > 0) return user.district_ids[0];
    return "";
  })();
  const defaultCluster: number | "" = (() => {
    if (!user) return "";
    if (user.title === "Cluster Coordinator" && user.cluster_ids.length > 0) return user.cluster_ids[0];
    return "";
  })();
  const defaultKutir: number | "" = (() => {
    if (!user) return "";
    if (user.title === "Teacher" && user.kutir_ids.length > 0) return user.kutir_ids[0];
    return "";
  })();
  const [filterDistrict, setFilterDistrict] = useState<number | "">(_savedFilters?.district ?? defaultDistrict);
  const [filterCluster, setFilterCluster] = useState<number | "">(_savedFilters?.cluster ?? defaultCluster);
  const [filterKutir, setFilterKutir] = useState<number | "">(_savedFilters?.kutir ?? defaultKutir);
  const [searchQuery, setSearchQuery] = useState(_savedFilters?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(_savedFilters?.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(_savedFilters?.page ?? 1);
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
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter(d => user.district_ids.includes(d.id));
  const scopedClusters = isAdmin || !user
    ? allClusters
    : user.cluster_ids.length > 0
      ? allClusters.filter(c => user.cluster_ids.includes(c.id))
      : allClusters;
  const scopedKutirs = isAdmin || !user
    ? allKutirs
    : user.kutir_ids.length > 0
      ? allKutirs.filter(k => user.kutir_ids.includes(k.id))
      : allKutirs;

  // Auto-select when scoped to a single district / cluster
  useEffect(() => {
    if (scopedDistricts.length === 1 && filterDistrict === "") {
      setFilterDistrict(scopedDistricts[0].id);
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scopedClusters.length === 1 && filterCluster === "" && !isAdmin) {
      setFilterCluster(scopedClusters[0].id);
    }
  }, [scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterClusters = scopedClusters.filter(c =>
    filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict
  );
  const filterKutirs = scopedKutirs.filter(k =>
    filterCluster !== "" ? k.cluster_id === filterCluster : true
  );

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
    sessionStorage.setItem("students_filter_state", JSON.stringify({
      district: filterDistrict, cluster: filterCluster,
      kutir: filterKutir, search: searchQuery, page,
    }));
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
    <>
      <select
        style={grs.filterSelect}
        value={filterDistrict}
        onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); setFilterKutir(""); setPage(1); }}
      >
        <option value="">All Districts</option>
        {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select
        style={grs.filterSelect}
        value={filterCluster}
        onChange={e => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); setPage(1); }}
        disabled={filterDistrict === "" && defaultCluster === ""}
      >
        <option value="">All Clusters</option>
        {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select
        style={grs.filterSelect}
        value={filterKutir}
        onChange={e => { setFilterKutir(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}
        disabled={filterCluster === "" && defaultKutir === ""}
      >
        <option value="">All Kutirs</option>
        {filterKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
    </>
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
          onDelete: () => { if (confirm(`Delete ${s.first_name} ${s.last_name}?`)) deleteMut.mutate(s.id); },
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
    </div>
  );
}
