import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  fetchKutirPerformanceReport,
  type TopKutirsGeoLevel,
  type KutirPerformanceReport,
} from "../api/visits";
import {
  KUTIR_PERFORMANCE_METRIC_KEYS,
  type KutirPerformanceMetricKey,
  visitFieldLabel,
} from "../constants/visitsFields";
import { ReportFiltersBar } from "../components/ReportFiltersBar";
import { countActiveFilters } from "../utils/geoFilters";

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
  borderRadius: 5,
  padding: "5px 8px",
  fontSize: "13px",
  fontWeight: 400,
  minWidth: 0,
  width: "100%",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
  lineHeight: 1.25,
};

const dateStyle: React.CSSProperties = {
  ...defaultControlStyle,
  padding: "5px 1.2rem 5px 8px",
};

/** Primary report control — matches table amber accent. */
const metricSelectStyle: React.CSSProperties = {
  border: "1.5px solid var(--badge-amber-fg)",
  borderRadius: 5,
  padding: "5px 8px",
  fontSize: "13px",
  fontWeight: 700,
  minWidth: 0,
  width: "100%",
  background: "var(--badge-amber-bg)",
  color: "var(--badge-amber-fg)",
  boxSizing: "border-box",
  lineHeight: 1.25,
};

const geoFieldStyle: React.CSSProperties = {
  flex: "0 1 88px",
  maxWidth: 112,
  minWidth: 84,
};

const metricFieldStyle: React.CSSProperties = {
  flex: "1 1 148px",
  maxWidth: 192,
  minWidth: 132,
};

const dateFieldStyle: React.CSSProperties = {
  flex: "0 0 124px",
  maxWidth: 132,
  minWidth: 118,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 2,
};

const metricLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--badge-amber-fg)",
  marginBottom: 2,
};

const filterHintStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "13px",
  lineHeight: 1.35,
  margin: 0,
};

function stars(n: number) {
  const full = Math.round(n);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function avgColumnLabel(report: KutirPerformanceReport): string {
  return `Avg ${visitFieldLabel(report.metric)}`;
}

function reportColumns(report: KutirPerformanceReport): string[] {
  return [
    ...(report.show_district ? ["District"] : []),
    ...(report.show_cluster ? ["Cluster"] : []),
    "Kutir Name",
    "Num Visits",
    avgColumnLabel(report),
  ];
}

function reportRowValues(
  report: KutirPerformanceReport,
  r: KutirPerformanceReport["rows"][number],
): string[] {
  return [
    ...(report.show_district ? [r.district_name ?? ""] : []),
    ...(report.show_cluster ? [r.cluster_name ?? ""] : []),
    r.kutir_name,
    String(r.num_visits),
    r.avg_score.toFixed(2),
  ];
}

function exportCSV(report: KutirPerformanceReport) {
  const hdr = reportColumns(report);
  const rows = report.rows.map((r) => reportRowValues(report, r));
  const csv = [hdr, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `kutir_performance_${report.metric}_${report.level}_${report.geo_id}_${report.date_from}_${report.date_to}.csv`;
  a.click();
}

function printReport(report: KutirPerformanceReport) {
  const w = window.open("", "_blank");
  if (!w) return;
  const thStyle =
    "border:1px solid #ccc;padding:6px 10px;font-size:12px;background:#eef2fb;text-align:left;font-weight:600";
  const tdStyle = "border:1px solid #e5e7eb;padding:6px 10px;font-size:12px";
  const cols = reportColumns(report);
  const ths = cols.map((c) => `<th style="${thStyle}">${c}</th>`).join("");
  const trs = report.rows
    .map((r, i) => {
      const cells = reportRowValues(report, r)
        .map((v) => `<td style="${tdStyle}">${v}</td>`)
        .join("");
      return `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">${cells}</tr>`;
    })
    .join("");
  w.document.write(
    `<html><head><title>${report.title}</title></head><body style="font-family:sans-serif;padding:20px">` +
      `<h2 style="margin:0 0 8px">${report.title}</h2>` +
      `<p style="color:#6b7280;font-size:12px;margin:0 0 16px">${report.date_from} → ${report.date_to}</p>` +
      `<table style="border-collapse:collapse;width:100%">` +
      `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>` +
      `<p style="color:#6b7280;font-size:12px;margin-top:12px">${report.rows.length} records</p>` +
      `</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

export default function KutirPerformanceReportPage() {
  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(today);
  const [level, setLevel] = useState<TopKutirsGeoLevel>("district");
  const [metric, setMetric] = useState<KutirPerformanceMetricKey>("kutir_performance");
  const [zoneId, setZoneId] = useState<FilterId>("");
  const [districtId, setDistrictId] = useState<FilterId>("");
  const [clusterId, setClusterId] = useState<FilterId>("");

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

  const districtsInZone = useMemo(
    () => (zoneId === "" ? [] : districts.filter((d) => d.zone_id === zoneId)),
    [districts, zoneId],
  );

  const clustersInDistrict = useMemo(() => {
    if (districtId === "") return [];
    const areaIds = new Set(areas.filter((a) => a.district_id === districtId).map((a) => a.id));
    return clusters.filter((c) => areaIds.has(c.area_id));
  }, [areas, clusters, districtId]);

  const geoId: FilterId =
    level === "zone" ? zoneId : level === "district" ? districtId : clusterId;

  const enabled = geoId !== "" && !!dateFrom && !!dateTo && dateTo >= dateFrom;

  const { data: report, isLoading, isFetching, error } = useQuery({
    queryKey: ["kutir-performance", dateFrom, dateTo, level, geoId, metric],
    queryFn: () =>
      fetchKutirPerformanceReport({
        date_from: dateFrom,
        date_to: dateTo,
        level,
        geo_id: Number(geoId),
        metric,
      }),
    enabled,
  });

  function onLevelChange(next: TopKutirsGeoLevel) {
    setLevel(next);
    setZoneId("");
    setDistrictId("");
    setClusterId("");
  }

  function onZoneChange(next: FilterId) {
    setZoneId(next);
    setDistrictId("");
    setClusterId("");
  }

  function onDistrictChange(next: FilterId) {
    setDistrictId(next);
    setClusterId("");
  }

  const showZone = true;
  const showDistrict = level === "district" || level === "cluster";
  const showCluster = level === "cluster";

  const promptLevel =
    level === "zone" ? "zone" : level === "district" ? "zone and district" : "zone, district, and cluster";

  const hdrCol: React.CSSProperties = {
    padding: "9px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--badge-amber-fg)",
    borderBottom: "2px solid #fbd38d",
  };
  const cell: React.CSSProperties = {
    padding: "9px 12px",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div className="grs-page" style={{ padding: "18px 22px" }}>
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
          {report?.title ?? "Kutir Performance"}
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

      <ReportFiltersBar
        activeFilterCount={countActiveFilters(
          zoneId,
          showDistrict ? districtId : "",
          showCluster ? clusterId : "",
        )}
      >
        <div style={metricFieldStyle}>
          <label style={metricLabelStyle}>Attribute</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as KutirPerformanceMetricKey)}
            style={metricSelectStyle}
          >
            {KUTIR_PERFORMANCE_METRIC_KEYS.map((key) => (
              <option key={key} value={key}>
                {visitFieldLabel(key)}
              </option>
            ))}
          </select>
        </div>
        <div style={geoFieldStyle}>
          <label style={labelStyle}>Geo level</label>
          <select
            value={level}
            onChange={(e) => onLevelChange(e.target.value as TopKutirsGeoLevel)}
            style={defaultControlStyle}
          >
            <option value="zone">Zone</option>
            <option value="district">District</option>
            <option value="cluster">Cluster</option>
          </select>
        </div>
        {showZone && (
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
        )}
        {showDistrict && (
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
        )}
        {showCluster && (
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
        )}
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
      </ReportFiltersBar>

      {!enabled && (
        <p style={filterHintStyle}>
          Choose an attribute, time period, and {promptLevel} to see all kutirs ranked by average
          score.
        </p>
      )}

      {enabled && (isLoading || isFetching) && (
        <p style={filterHintStyle}>Loading…</p>
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
                  <tr style={{ background: "var(--badge-amber-bg)" }}>
                    {report.show_district && <th style={hdrCol}>District</th>}
                    {report.show_cluster && <th style={hdrCol}>Cluster</th>}
                    <th style={hdrCol}>Kutir Name</th>
                    <th style={{ ...hdrCol, textAlign: "center" }}>Num Visits</th>
                    <th style={hdrCol}>{avgColumnLabel(report)}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr
                      key={r.kutir_id}
                      style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--badge-amber-bg)" }}
                    >
                      {report.show_district && (
                        <td style={{ ...cell, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                          {r.district_name ?? "—"}
                        </td>
                      )}
                      {report.show_cluster && (
                        <td style={{ ...cell, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                          {r.cluster_name ?? "—"}
                        </td>
                      )}
                      <td style={cell}>
                        <Link
                          to={`/kutirs/${r.kutir_id}`}
                          style={{
                            color: "var(--badge-amber-fg)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {r.kutir_name}
                        </Link>
                      </td>
                      <td
                        style={{
                          ...cell,
                          textAlign: "center",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.num_visits}
                      </td>
                      <td style={cell}>
                        <span style={{ color: "var(--star-active)" }}>{stars(r.avg_score)}</span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-secondary)",
                            marginLeft: 6,
                          }}
                        >
                          {r.avg_score.toFixed(2)}
                        </span>
                      </td>
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
