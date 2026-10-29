import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RowCountBadge, styles } from "@parivaar/ui";
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
import {
  fetchVisitDetailedReport,
  type KutirVisit,
  type TopKutirsGeoLevel,
  type VisitDetailedReport,
  type VisitDetailedRow,
} from "../api/visits";
import { visitField } from "../constants/visitsFields";

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

type FilterId = number | "";

const defaultControlStyle: React.CSSProperties = {
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

const dateStyle: React.CSSProperties = {
  ...defaultControlStyle,
  padding: "8px 1.35rem 8px 10px",
};

const geoFieldStyle: React.CSSProperties = {
  flex: "1 1 110px",
  maxWidth: 150,
  minWidth: 100,
};

const dateFieldStyle: React.CSSProperties = {
  flex: "0 0 138px",
  maxWidth: 146,
  minWidth: 132,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
};

/** Header identity columns, then visit detail field keys (in form/list order). */
const HEADER_COLS: { key: string; label: string }[] = [
  { key: "visitor_name", label: "Visitor" },
  { key: "visitor_role", label: "Role" },
  { key: "state_name", label: "State" },
  { key: "zone_name", label: "Zone" },
  { key: "district_name", label: "District" },
  { key: "area_name", label: "Area" },
  { key: "cluster_name", label: "Cluster" },
  { key: "kutir_name", label: "Kutir" },
];

/** All visit detail fields for the report (after geo header). Prefer registry labels. */
const VISIT_DETAIL_KEYS: { key: keyof KutirVisit; label: string }[] = [
  { key: "visit_date", label: visitField("visit_date").label },
  { key: "avg_attendance_morning", label: "Attendance Morning" },
  { key: "avg_attendance_evening", label: "Attendance Evening" },
  { key: "regular_students_morning", label: "Regular Students Morning" },
  { key: "regular_students_evening", label: "Regular Students Evening" },
  { key: "follow_timetable", label: visitField("follow_timetable").label },
  { key: "kutir_closed", label: "Kutir Closed" },
  { key: "plan_hindi", label: "Plan Hindi" },
  { key: "plan_math", label: "Plan Math" },
  { key: "plan_english", label: "Plan English" },
  { key: "timetable_plan_reason", label: "Timetable / Plan Reason" },
  { key: "math_topics_pre", label: "Math Topics (Pre)" },
  { key: "math_topics_upper", label: "Math Topics (Upper)" },
  { key: "english_topics_pre", label: "English Topics (Pre)" },
  { key: "english_topics_upper", label: "English Topics (Upper)" },
  { key: "timeslot_reason", label: "Timeslot Reason" },
  { key: "physical_vs_registered", label: visitField("physical_vs_registered").label },
  { key: "workbook_percentage", label: visitField("workbook_percentage").label },
  { key: "workbook_completion", label: visitField("workbook_completion").label },
  { key: "book_availability", label: visitField("book_availability").label },
  { key: "cleanliness", label: visitField("cleanliness").label },
  { key: "hindi_proficiency", label: visitField("hindi_proficiency").label },
  { key: "english_proficiency", label: visitField("english_proficiency").label },
  { key: "maths_proficiency", label: visitField("maths_proficiency").label },
  { key: "evs_proficiency", label: visitField("evs_proficiency").label },
  { key: "reasoning_proficiency", label: visitField("reasoning_proficiency").label },
  { key: "material_management", label: visitField("material_management").label },
  { key: "kutir_performance", label: visitField("kutir_performance").label },
  { key: "staff_behavior", label: visitField("staff_behavior").label },
  { key: "reg_admission_forms", label: "Admission Forms" },
  { key: "reg_attendance_students", label: "Students Attendance Reg." },
  { key: "reg_daily_activity", label: "Daily Activity Reg." },
  { key: "reg_observation", label: "Observation Reg." },
  { key: "reg_students_data", label: "Student Alive Data" },
  { key: "reg_attendance_teachers", label: "Teachers Attendance Reg." },
  { key: "reg_students_documents", label: "Student Documents" },
  { key: "timeslot_bal_sabha", label: "Bal Sabha" },
  { key: "timeslot_sports", label: "Sports" },
  { key: "timeslot_yoga", label: "Yoga" },
  { key: "timeslot_value_ed", label: "Value Education" },
  { key: "timeslot_gk_map", label: "GK / Map" },
  { key: "grs_prep_remarks", label: visitField("grs_prep_remarks").label },
  { key: "final_remarks", label: visitField("final_remarks").label },
];

function fmtCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function rowValues(r: VisitDetailedRow): string[] {
  const header = HEADER_COLS.map((c) => {
    if (c.key === "visitor_name") return r.visitor_name;
    if (c.key === "visitor_role") return r.visitor_role ?? "—";
    if (c.key === "state_name") return r.state_name ?? "—";
    if (c.key === "zone_name") return r.zone_name ?? "—";
    if (c.key === "district_name") return r.district_name ?? "—";
    if (c.key === "area_name") return r.area_name ?? "—";
    if (c.key === "cluster_name") return r.cluster_name ?? "—";
    return r.kutir_name;
  });
  const details = VISIT_DETAIL_KEYS.map((c) => fmtCell(r.visit[c.key]));
  return [...header, ...details];
}

function allLabels(): string[] {
  return [...HEADER_COLS.map((c) => c.label), ...VISIT_DETAIL_KEYS.map((c) => c.label)];
}

function exportCSV(report: VisitDetailedReport) {
  const hdr = allLabels();
  const rows = report.rows.map((r) => rowValues(r));
  const csv = [hdr, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `kutir_visit_detailed_${report.level}_${report.geo_id}_${report.date_from}_${report.date_to}.csv`;
  a.click();
}

function printReport(report: VisitDetailedReport) {
  const w = window.open("", "_blank");
  if (!w) return;
  const thStyle =
    "border:1px solid #ccc;padding:4px 6px;font-size:10px;background:#eef2fb;text-align:left;font-weight:600;white-space:nowrap";
  const tdStyle = "border:1px solid #e5e7eb;padding:4px 6px;font-size:10px";
  const cols = allLabels();
  const ths = cols.map((c) => `<th style="${thStyle}">${c}</th>`).join("");
  const trs = report.rows
    .map((r, i) => {
      const cells = rowValues(r)
        .map((v) => `<td style="${tdStyle}">${v.replace(/</g, "&lt;")}</td>`)
        .join("");
      return `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">${cells}</tr>`;
    })
    .join("");
  w.document.write(
    `<html><head><title>${report.title}</title></head><body style="font-family:sans-serif;padding:16px">` +
      `<h2 style="margin:0 0 8px">${report.title}</h2>` +
      `<p style="color:#6b7280;font-size:12px;margin:0 0 12px">${report.date_from} → ${report.date_to}</p>` +
      `<div style="overflow:auto"><table style="border-collapse:collapse;width:100%">` +
      `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>` +
      `<p style="color:#6b7280;font-size:12px;margin-top:12px">${report.rows.length} records</p>` +
      `</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

export default function VisitDetailedReportPage() {
  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(today);
  const [zoneId, setZoneId] = useState<FilterId>("");
  const [districtId, setDistrictId] = useState<FilterId>("");
  const [clusterId, setClusterId] = useState<FilterId>("");

  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["zones"], queryFn: listZones });
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: areas = [] } = useQuery<Area[]>({ queryKey: ["areas"], queryFn: () => listAreas() });
  const { data: clusters = [] } = useQuery<Cluster[]>({
    queryKey: ["clusters"],
    queryFn: () => listClusters(),
  });

  const districtsInZone = useMemo(
    () => (zoneId === "" ? [] : districts.filter((d) => d.zone_id === zoneId)),
    [districts, zoneId],
  );

  const clustersInDistrict = useMemo(() => {
    if (districtId === "") return [];
    const areaIds = new Set(areas.filter((a) => a.district_id === districtId).map((a) => a.id));
    return clusters.filter((c) => areaIds.has(c.area_id));
  }, [areas, clusters, districtId]);

  /** Most specific geo pick drives the API (cluster > district > zone). */
  const scopePick: { level: TopKutirsGeoLevel; geoId: number } | null =
    clusterId !== ""
      ? { level: "cluster", geoId: clusterId }
      : districtId !== ""
        ? { level: "district", geoId: districtId }
        : zoneId !== ""
          ? { level: "zone", geoId: zoneId }
          : null;

  const enabled = scopePick !== null && !!dateFrom && !!dateTo && dateTo >= dateFrom;

  const { data: report, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "visit-detailed-report",
      dateFrom,
      dateTo,
      scopePick?.level,
      scopePick?.geoId,
    ],
    queryFn: () =>
      fetchVisitDetailedReport({
        date_from: dateFrom,
        date_to: dateTo,
        level: scopePick!.level,
        geo_id: scopePick!.geoId,
      }),
    enabled,
  });

  function onZoneChange(next: FilterId) {
    setZoneId(next);
    setDistrictId("");
    setClusterId("");
  }

  function onDistrictChange(next: FilterId) {
    setDistrictId(next);
    setClusterId("");
  }

  const hdrCol: React.CSSProperties = {
    padding: "8px 10px",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--badge-blue-fg)",
    borderBottom: "2px solid var(--badge-blue-bg)",
    whiteSpace: "nowrap",
    fontSize: "0.78rem",
  };
  const cell: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--border)",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  };

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, color: "var(--text-primary)", minWidth: 0 }}>
          {report?.title ?? "Kutir Visit Detailed Report"}
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => report && exportCSV(report)}
            style={{
              ...styles.btnIcon,
              opacity: report ? 1 : 0.45,
              cursor: report ? "pointer" : "not-allowed",
            }}
            title="Export CSV"
            disabled={!report}
          >
            <IconDownload />
          </button>
          <button
            type="button"
            onClick={() => report && printReport(report)}
            style={{
              ...styles.btnIcon,
              opacity: report ? 1 : 0.45,
              cursor: report ? "pointer" : "not-allowed",
            }}
            title="Print"
            disabled={!report}
          >
            <IconPrint />
          </button>
        </div>
      </div>

      <div
        className="grs-form"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
          alignItems: "flex-end",
        }}
      >
        <div style={geoFieldStyle}>
          <label style={labelStyle}>Zone</label>
          <select
            value={zoneId === "" ? "" : String(zoneId)}
            onChange={(e) => onZoneChange(e.target.value ? Number(e.target.value) : "")}
            style={defaultControlStyle}
          >
            <option value="">Select…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div style={geoFieldStyle}>
          <label style={labelStyle}>District</label>
          <select
            value={districtId === "" ? "" : String(districtId)}
            onChange={(e) => onDistrictChange(e.target.value ? Number(e.target.value) : "")}
            style={defaultControlStyle}
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
        <div style={geoFieldStyle}>
          <label style={labelStyle}>Cluster</label>
          <select
            value={clusterId === "" ? "" : String(clusterId)}
            onChange={(e) => setClusterId(e.target.value ? Number(e.target.value) : "")}
            style={defaultControlStyle}
            disabled={districtId === ""}
          >
            <option value="">
              {districtId === "" ? "Select district first…" : "Select…"}
            </option>
            {clustersInDistrict.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={dateFieldStyle}>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            className="top-kutirs-date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={dateStyle}
          />
        </div>
        <div style={dateFieldStyle}>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            className="top-kutirs-date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={dateStyle}
          />
        </div>
      </div>

      {!enabled && (
        <p style={{ color: "var(--text-secondary)" }}>
          Choose a time period and at least a Zone (optionally District / Cluster) to see kutir
          visit details.
        </p>
      )}

      {enabled && (isLoading || isFetching) && (
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      )}

      {enabled && error && (
        <p style={{ color: "var(--status-danger-fg)" }}>
          Could not load report. Check filters and try again.
        </p>
      )}

      {enabled && report && !isLoading && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 12,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <RowCountBadge count={report.rows.length} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              {dateFrom} → {dateTo}
            </span>
          </div>

          {report.rows.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
              No visits in this period for the selected geography.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--badge-blue-bg)" }}>
                    {allLabels().map((h) => (
                      <th key={h} style={hdrCol}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr
                      key={r.visit.id}
                      style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}
                    >
                      {rowValues(r).map((v, j) => (
                        <td key={j} style={cell}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
