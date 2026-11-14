import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReportPageShell, RowCountBadge } from "@parivaar/ui";
import api from "../api/client";
import {
  getAdmissionFunnelByEntity,
  listExams,
  type AdmissionFunnelEntityLevel,
  type AdmissionFunnelEntityRow,
  type AdmissionFunnelRowLevel,
  type StudentExam,
} from "../api/admissions";
import {
  listZones,
  listDistricts,
  listAreas,
  listClusters,
  type Zone,
  type District,
  type Area,
  type Cluster,
} from "../api/geo";
import { listKutirs, type Kutir as KutirListItem } from "../api/kutirs";
import { STAGES, FUNNEL_STAGE_LABELS } from "../components/admissions-pipeline";
import { ReportPageHeader } from "../components/ReportPageHeader";
import { countActiveFilters, type FilterId } from "../utils/geoFilters";

const CURRENT_YEAR = new Date().getFullYear();

/** Report table columns: Registered (distinct students) then pipeline stages. */
const REPORT_FUNNEL_COLUMNS = [
  { key: "registered" as const, label: "Registered" },
  ...STAGES.map((s) => ({ key: s.key, label: FUNNEL_STAGE_LABELS[s.key] })),
] as const;

type ReportFunnelKey = (typeof REPORT_FUNNEL_COLUMNS)[number]["key"];
type ReportStageCounts = Record<ReportFunnelKey, number>;

interface Kutir { id: number; name: string; code: string }
interface Student { id: number; first_name: string; last_name: string; kutir_id: number | null }
interface School { id: number; name: string; school_type: string }

function useKutirs() {
  return useQuery<Kutir[]>({ queryKey: ["kutirs"], queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data });
}
function useStudents() {
  return useQuery<Student[]>({ queryKey: ["students-all"], queryFn: async () => (await api.get("/students", { params: { limit: 5000 } })).data });
}
function useSchools() {
  return useQuery<School[]>({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools", { params: { limit: 500 } })).data });
}

type FunnelRow = { entity: { id: number; name: string; level: AdmissionFunnelRowLevel } } & ReportStageCounts;

const FUNNEL_ROW_COLUMN: Record<AdmissionFunnelRowLevel, string> = {
  district: "District",
  area: "Area",
  cluster: "Cluster",
  kutir: "Kutir",
};

function emptyReportCounts(): ReportStageCounts {
  return Object.fromEntries(REPORT_FUNNEL_COLUMNS.map((s) => [s.key, 0])) as ReportStageCounts;
}

function funnelRowsToTotals(rows: FunnelRow[]): ReportStageCounts {
  return rows.reduce(
    (acc, r) => {
      for (const col of REPORT_FUNNEL_COLUMNS) acc[col.key] += r[col.key];
      return acc;
    },
    emptyReportCounts(),
  );
}

function entityFunnelToRows(rows: AdmissionFunnelEntityRow[]): FunnelRow[] {
  return rows.map((r) => {
    const counts = emptyReportCounts();
    counts.registered = r.registered ?? 0;
    for (const stage of STAGES) {
      counts[stage.key] = r[stage.key];
    }
    return {
      entity: { id: r.entity_id, name: r.entity_name, level: r.row_level },
      ...counts,
    };
  });
}

function FunnelTable({
  rows,
  totals,
  columnLabel,
}: {
  rows: FunnelRow[];
  totals: ReportStageCounts;
  columnLabel: string;
}) {
  const numCol: React.CSSProperties = {
    padding: "9px 12px",
    textAlign: "center",
    borderBottom: "1px solid var(--border)",
    fontVariantNumeric: "tabular-nums",
  };
  const hdrCol: React.CSSProperties = {
    padding: "9px 12px",
    textAlign: "center",
    fontWeight: 600,
    color: "var(--badge-blue-fg)",
    borderBottom: "2px solid var(--badge-blue-bg)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--badge-blue-bg)" }}>
            <th style={{ ...hdrCol, textAlign: "left" }}>{columnLabel}</th>
            {REPORT_FUNNEL_COLUMNS.map((s) => (
              <th key={s.key} style={hdrCol}>
                {s.label}
              </th>
            ))}
            <th style={hdrCol}>Conv. %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.entity.level}-${r.entity.id}`} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                {r.entity.level === "kutir" ? (
                  <Link
                    to={`/kutirs/${r.entity.id}`}
                    style={{ color: "var(--badge-blue-fg)", textDecoration: "none", fontWeight: 600 }}
                  >
                    {r.entity.name}
                  </Link>
                ) : (
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.entity.name}</span>
                )}
              </td>
              {REPORT_FUNNEL_COLUMNS.map((s) => {
                const v = r[s.key];
                const highlight = (s.key === "selected" || s.key === "admitted") && v > 0;
                return (
                  <td
                    key={s.key}
                    style={{
                      ...numCol,
                      color: highlight ? "var(--status-success-fg)" : undefined,
                      fontWeight: highlight ? 700 : 400,
                    }}
                  >
                    {v}
                  </td>
                );
              })}
              <td style={numCol}>
                {r.registered > 0 ? `${Math.round((r.admitted / r.registered) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--badge-blue-bg)", fontWeight: 700 }}>
            <td
              style={{
                padding: "9px 12px",
                borderTop: "2px solid var(--badge-blue-bg)",
                color: "var(--badge-blue-fg)",
              }}
            >
              Total
            </td>
            {REPORT_FUNNEL_COLUMNS.map((s) => (
              <td
                key={s.key}
                style={{
                  ...numCol,
                  borderTop: "2px solid var(--badge-blue-bg)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {totals[s.key]}
              </td>
            ))}
            <td
              style={{
                ...numCol,
                borderTop: "2px solid var(--badge-blue-bg)",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {totals.registered > 0
                ? `${Math.round((totals.admitted / totals.registered) * 100)}%`
                : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

type FunnelEntityLevel = AdmissionFunnelEntityLevel;

const funnelControlStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: "16px",
  fontWeight: 400,
  minWidth: 0,
  width: "100%",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};

const funnelLevelSelectStyle: React.CSSProperties = {
  border: "1.5px solid var(--badge-blue-fg)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: "14px",
  fontWeight: 700,
  minWidth: 0,
  width: "100%",
  background: "var(--badge-blue-bg)",
  color: "var(--badge-blue-fg)",
  boxSizing: "border-box",
};

const funnelGeoFieldStyle: React.CSSProperties = {
  flex: "1 1 110px",
  maxWidth: 150,
  minWidth: 100,
};

const funnelLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
};

const funnelGeoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "var(--badge-blue-fg)",
  marginBottom: 4,
};

function useAdmittedRows(year: number) {
  const { data: kutirs = [] } = useKutirs();
  const { data: students = [] } = useStudents();
  const { data: schools = [] } = useSchools();
  const { data: exams = [], isLoading, error } = useQuery<StudentExam[]>({
    queryKey: ["exams", year],
    queryFn: () => listExams({ school_start_year: year }),
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const kutirMap = new Map(kutirs.map((k) => [k.id, k]));
  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const admitted = exams
    .filter((e) => e.admitted && e.admitted_school_id)
    .sort((a, b) => {
      const kA = studentMap.get(a.student_id)?.kutir_id ?? 0;
      const kB = studentMap.get(b.student_id)?.kutir_id ?? 0;
      return kA - kB;
    });

  function exportCSV() {
    const rows = admitted.map((e) => {
      const s = studentMap.get(e.student_id);
      const school = schoolMap.get(e.admitted_school_id!);
      const kutir = kutirMap.get(s?.kutir_id ?? 0);
      return [
        e.student_id,
        s ? `${s.first_name} ${s.last_name}` : "",
        kutir?.name ?? "",
        school?.name ?? "",
        school?.school_type ?? "",
        e.application_number ?? "",
        e.roll_number ?? "",
      ];
    });
    const hdr = ["ID", "Student", "Kutir", "School", "Type", "Application #", "Roll #"];
    const csv = [hdr, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admitted_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { admitted, studentMap, kutirMap, schoolMap, isLoading, error, exportCSV };
}

function AdmittedTable({
  admitted,
  studentMap,
  kutirMap,
  schoolMap,
}: {
  admitted: StudentExam[];
  studentMap: Map<number, Student>;
  kutirMap: Map<number, Kutir>;
  schoolMap: Map<number, School>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--status-success-bg)" }}>
            {["Student", "Kutir", "Admitted School", "Type", "App #", "Roll #"].map((h) => (
              <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "var(--status-success-fg)", borderBottom: "2px solid var(--status-success-fg)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {admitted.map((e, i) => {
            const s = studentMap.get(e.student_id);
            const kutir = kutirMap.get(s?.kutir_id ?? 0);
            const school = schoolMap.get(e.admitted_school_id!);
            return (
              <tr key={e.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--status-success-bg)" }}>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  <Link to={`/students/${e.student_id}`} style={{ color: "var(--status-success-fg)", textDecoration: "none", fontWeight: 600 }}>
                    {s ? `${s.first_name} ${s.last_name}` : `#${e.student_id}`}
                  </Link>
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {kutir ? <Link to={`/kutirs/${kutir.id}`} style={{ color: "var(--badge-blue-fg)", textDecoration: "none" }}>{kutir.name}</Link> : "—"}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {school?.name ?? `#${e.admitted_school_id}`}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  {school && (
                    <span style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-fg)", borderRadius: 4, padding: "2px 7px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {school.school_type}
                    </span>
                  )}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{e.application_number ?? "—"}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{e.roll_number ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SchoolYearSelect({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  return (
    <div style={{ flex: "1 1 140px", maxWidth: 180, minWidth: 120 }}>
      <label
        style={{
          display: "block",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 4,
        }}
      >
        School year
      </label>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: "16px",
          width: "100%",
          boxSizing: "border-box",
          background: "var(--bg-input)",
          color: "var(--text-primary)",
        }}
      >
        {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
          <option key={y} value={y}>
            {y}-{String(y + 1).slice(2)}
          </option>
        ))}
      </select>
    </div>
  );
}

type AdmissionClassFilter = "" | 5 | 8;

export function AdmissionFunnelReportPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [admissionClass, setAdmissionClass] = useState<AdmissionClassFilter>("");
  const [level, setLevel] = useState<FunnelEntityLevel>("district");
  const [zoneId, setZoneId] = useState<FilterId>("");
  const [districtId, setDistrictId] = useState<FilterId>("");
  const [areaId, setAreaId] = useState<FilterId>("");
  const [clusterId, setClusterId] = useState<FilterId>("");
  const [kutirId, setKutirId] = useState<FilterId>("");

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: listZones,
  });
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: () => listAreas(),
  });
  const { data: clusters = [] } = useQuery<Cluster[]>({
    queryKey: ["clusters"],
    queryFn: () => listClusters(),
  });
  const { data: kutirs = [] } = useQuery<KutirListItem[]>({
    queryKey: ["kutirs-funnel", { limit: 500 }],
    queryFn: () => listKutirs({ limit: 500 }),
  });

  const districtsInZone = useMemo(
    () => (zoneId === "" ? [] : districts.filter((d) => d.zone_id === zoneId)),
    [districts, zoneId],
  );
  const areasInDistrict = useMemo(
    () => (districtId === "" ? [] : areas.filter((a) => a.district_id === districtId)),
    [areas, districtId],
  );
  const clustersInArea = useMemo(
    () => (areaId === "" ? [] : clusters.filter((c) => c.area_id === areaId)),
    [clusters, areaId],
  );
  const clustersInDistrict = useMemo(() => {
    if (districtId === "") return [];
    const areaIds = new Set(areas.filter((a) => a.district_id === districtId).map((a) => a.id));
    return clusters.filter((c) => areaIds.has(c.area_id));
  }, [areas, clusters, districtId]);
  const clusterOptions = level === "cluster" ? clustersInDistrict : clustersInArea;
  const kutirsInCluster = useMemo(
    () => (clusterId === "" ? [] : kutirs.filter((k) => k.cluster_id === clusterId)),
    [kutirs, clusterId],
  );

  const leafGeoId: FilterId =
  level === "zone"
    ? zoneId
    : level === "district"
      ? districtId
      : level === "area"
        ? areaId
        : level === "cluster"
          ? clusterId
          : kutirId;

  const enabled = leafGeoId !== "";

  const funnelParams = useMemo(() => {
    const base = {
      school_start_year: year,
      entity_level: level,
      ...(admissionClass !== "" ? { admission_class: admissionClass } : {}),
    };
    if (level === "zone" && zoneId !== "") return { ...base, zone_id: Number(zoneId) };
    if (level === "district" && districtId !== "") return { ...base, district_id: Number(districtId) };
    if (level === "area" && areaId !== "") return { ...base, area_id: Number(areaId) };
    if (level === "cluster" && clusterId !== "") return { ...base, cluster_id: Number(clusterId) };
    if (level === "kutir" && kutirId !== "") return { ...base, kutir_id: Number(kutirId) };
    return base;
  }, [year, admissionClass, level, zoneId, districtId, areaId, clusterId, kutirId]);

  const { data: funnelByEntity = [], isLoading, isFetching, error } = useQuery({
    queryKey: ["admission-funnel-report-by-entity", funnelParams],
    queryFn: () => getAdmissionFunnelByEntity(funnelParams),
    enabled,
  });

  const funnelRows = useMemo(() => entityFunnelToRows(funnelByEntity), [funnelByEntity]);
  const funnelTotals = useMemo(() => funnelRowsToTotals(funnelRows), [funnelRows]);
  const funnelColumnLabel = funnelByEntity[0]?.row_level
    ? FUNNEL_ROW_COLUMN[funnelByEntity[0].row_level]
    : FUNNEL_ROW_COLUMN[
        level === "zone"
          ? "district"
          : level === "district"
            ? "area"
            : level === "area"
              ? "cluster"
              : "kutir"
      ];
  const funnelExamTotal = useMemo(
    () => funnelByEntity.reduce((sum, r) => sum + r.total, 0),
    [funnelByEntity],
  );

  function onLevelChange(next: FunnelEntityLevel) {
    setLevel(next);
    setZoneId("");
    setDistrictId("");
    setAreaId("");
    setClusterId("");
    setKutirId("");
  }

  function onZoneChange(next: FilterId) {
    setZoneId(next);
    setDistrictId("");
    setAreaId("");
    setClusterId("");
    setKutirId("");
  }

  function onDistrictChange(next: FilterId) {
    setDistrictId(next);
    setAreaId("");
    setClusterId("");
    setKutirId("");
  }

  function onAreaChange(next: FilterId) {
    setAreaId(next);
    setClusterId("");
    setKutirId("");
  }

  function onClusterChange(next: FilterId) {
    setClusterId(next);
    setKutirId("");
  }

  const showDistrict = level !== "zone";
  const showArea = level === "area" || level === "kutir";
  const showCluster = level === "cluster" || level === "kutir";
  const showKutir = level === "kutir";

  const promptParts: string[] = ["zone"];
  if (showDistrict) promptParts.push("district");
  if (showArea) promptParts.push("area");
  if (showCluster) promptParts.push("cluster");
  if (showKutir) promptParts.push("kutir");

  return (
    <ReportPageShell
      header={<ReportPageHeader title="Admission Funnel" />}
      filters={
        <>
          <div style={funnelGeoFieldStyle}>
            <label style={funnelGeoLabelStyle}>Entity level</label>
            <select
              value={level}
              onChange={(e) => onLevelChange(e.target.value as FunnelEntityLevel)}
              style={funnelLevelSelectStyle}
            >
              <option value="zone">Zone</option>
              <option value="district">District</option>
              <option value="area">Area</option>
              <option value="cluster">Cluster</option>
              <option value="kutir">Kutir</option>
            </select>
          </div>
          <div style={funnelGeoFieldStyle}>
            <label style={funnelLabelStyle}>Zone</label>
            <select
              value={zoneId === "" ? "" : String(zoneId)}
              onChange={(e) => onZoneChange(e.target.value ? Number(e.target.value) : "")}
              style={funnelControlStyle}
            >
              <option value="">Select…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          {showDistrict && (
            <div style={funnelGeoFieldStyle}>
              <label style={funnelLabelStyle}>District</label>
              <select
                value={districtId === "" ? "" : String(districtId)}
                onChange={(e) => onDistrictChange(e.target.value ? Number(e.target.value) : "")}
                style={funnelControlStyle}
                disabled={zoneId === ""}
              >
                <option value="">{zoneId === "" ? "Select zone first…" : "Select…"}</option>
                {districtsInZone.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showArea && (
            <div style={funnelGeoFieldStyle}>
              <label style={funnelLabelStyle}>Area</label>
              <select
                value={areaId === "" ? "" : String(areaId)}
                onChange={(e) => onAreaChange(e.target.value ? Number(e.target.value) : "")}
                style={funnelControlStyle}
                disabled={districtId === ""}
              >
                <option value="">{districtId === "" ? "Select district first…" : "Select…"}</option>
                {areasInDistrict.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showCluster && (
            <div style={funnelGeoFieldStyle}>
              <label style={funnelLabelStyle}>Cluster</label>
              <select
                value={clusterId === "" ? "" : String(clusterId)}
                onChange={(e) => onClusterChange(e.target.value ? Number(e.target.value) : "")}
                style={funnelControlStyle}
                disabled={level === "cluster" ? districtId === "" : areaId === ""}
              >
                <option value="">
                  {level === "cluster" && districtId === ""
                    ? "Select district first…"
                    : areaId === ""
                      ? "Select area first…"
                      : "Select…"}
                </option>
                {clusterOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showKutir && (
            <div style={funnelGeoFieldStyle}>
              <label style={funnelLabelStyle}>Kutir</label>
              <select
                value={kutirId === "" ? "" : String(kutirId)}
                onChange={(e) => setKutirId(e.target.value ? Number(e.target.value) : "")}
                style={funnelControlStyle}
                disabled={clusterId === ""}
              >
                <option value="">{clusterId === "" ? "Select cluster first…" : "Select…"}</option>
                {kutirsInCluster.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={funnelGeoFieldStyle}>
            <label style={funnelLabelStyle}>Class</label>
            <select
              value={admissionClass === "" ? "" : String(admissionClass)}
              onChange={(e) => {
                const v = e.target.value;
                setAdmissionClass(v === "" ? "" : (Number(v) as 5 | 8));
              }}
              style={funnelControlStyle}
            >
              <option value="">All</option>
              <option value="5">5th</option>
              <option value="8">8th</option>
            </select>
          </div>
          <SchoolYearSelect year={year} setYear={setYear} />
        </>
      }
      activeFilterCount={countActiveFilters(
        year,
        admissionClass,
        zoneId,
        showDistrict ? districtId : "",
        showArea ? areaId : "",
        showCluster ? clusterId : "",
        showKutir ? kutirId : "",
      )}
      isLoading={enabled && (isLoading || isFetching)}
      error={enabled && error ? "Could not load funnel. Check filters and try again." : undefined}
      isEmpty={Boolean(enabled && !isLoading && funnelRows.length === 0)}
      emptyMessage={`No exam records for ${year} in the selected geography.`}
      toolbar={
        enabled && funnelRows.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <RowCountBadge count={funnelExamTotal} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              exam records · {year}
              {funnelTotals.registered > 0
                ? ` · ${Math.round((funnelTotals.admitted / funnelTotals.registered) * 100)}% registered→admitted`
                : ""}
            </span>
          </div>
        ) : undefined
      }
    >
      {!enabled ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Choose entity level and {promptParts.join(", ")} to see the admission funnel for the school year.
        </p>
      ) : funnelRows.length > 0 ? (
        <FunnelTable rows={funnelRows} totals={funnelTotals} columnLabel={funnelColumnLabel} />
      ) : null}
    </ReportPageShell>
  );
}

export function AdmittedStudentsReportPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const { admitted, studentMap, kutirMap, schoolMap, isLoading, error, exportCSV } = useAdmittedRows(year);

  return (
    <ReportPageShell
      header={
        <ReportPageHeader
          title="Admitted Students"
          actions={
            <button
              type="button"
              onClick={exportCSV}
              disabled={admitted.length === 0}
              style={{
                background: "var(--status-success-bg)",
                color: "var(--status-success-fg)",
                border: "1px solid var(--status-success-fg)",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: admitted.length === 0 ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                opacity: admitted.length === 0 ? 0.45 : 1,
              }}
            >
              ↓ Export CSV
            </button>
          }
        />
      }
      filters={<SchoolYearSelect year={year} setYear={setYear} />}
      activeFilterCount={countActiveFilters(year !== CURRENT_YEAR ? year : "")}
      isLoading={isLoading}
      error={error ? "Could not load report. Try again." : undefined}
      isEmpty={!isLoading && admitted.length === 0}
      emptyMessage={`No admitted students for ${year}.`}
      toolbar={
        admitted.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <RowCountBadge count={admitted.length} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              admitted in {year}
            </span>
          </div>
        ) : undefined
      }
    >
      {admitted.length > 0 ? (
        <AdmittedTable
          admitted={admitted}
          studentMap={studentMap}
          kutirMap={kutirMap}
          schoolMap={schoolMap}
        />
      ) : null}
    </ReportPageShell>
  );
}
