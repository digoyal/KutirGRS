import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listVisits } from "../api/visits";
import type { KutirVisit } from "../api/visits";
import { listKutirs } from "../api/kutirs";

// ─── helpers ────────────────────────────────────────────────────────────────
const avg = (arr: number[]) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

const pct = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0;

function Star({ v }: { v: number }) {
  const filled = Math.round(v);
  return (
    <span style={{ color: "var(--star-active)", fontSize: "1rem", letterSpacing: 1 }}>
      {"★".repeat(filled)}
      <span style={{ color: "var(--star-inactive)" }}>{"★".repeat(5 - filled)}</span>
    </span>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "20px 24px",
        borderLeft: `4px solid ${accent ?? "var(--link-color)"}`,
        flex: "1 1 160px",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pctW = Math.round((value / 5) * 100);
  const color = value >= 4 ? "var(--status-success-fg)" : value >= 3 ? "var(--star-active)" : "var(--badge-red-fg)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {value.toFixed(1)} / 5
        </span>
      </div>
      <div style={{ height: 7, background: "var(--bg-input)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pctW}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function DonutSlice({
  slices,
}: {
  slices: { label: string; count: number; color: string }[];
}) {
  const total = slices.reduce((s, sl) => s + sl.count, 0);
  if (!total) return <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No data</div>;

  let offset = 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const paths = slices.map((sl) => {
    const frac = sl.count / total;
    const dash = frac * circ;
    const el = (
      <circle
        key={sl.label}
        cx={70} cy={70} r={r}
        fill="none"
        stroke={sl.color}
        strokeWidth={20}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px" }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--bg-input)" strokeWidth={20} />
        {paths}
        <text x={70} y={74} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: "var(--text-primary)" }}>
          {total}
        </text>
        <text x={70} y={88} textAnchor="middle" style={{ fontSize: 9, fill: "var(--text-secondary)" }}>total</text>
      </svg>
      <div>
        {slices.map((sl) => (
          <div key={sl.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: sl.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {sl.label}
            </span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginLeft: "auto", paddingLeft: 12 }}>
              {sl.count} ({pct(sl.count, total)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// visits-per-month sparkline bar chart
function MonthlyChart({ visits }: { visits: KutirVisit[] }) {
  const buckets: Record<string, number> = {};
  visits.forEach((v) => {
    const ym = v.visit_date.slice(0, 7);
    buckets[ym] = (buckets[ym] ?? 0) + 1;
  });
  const keys = Object.keys(buckets).sort();
  if (!keys.length) return null;
  const max = Math.max(...Object.values(buckets), 1);

  // show last 18 months max
  const shown = keys.slice(-18);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, minWidth: shown.length * 32, height: 90 }}>
        {shown.map((ym) => {
          const count = buckets[ym];
          const h = Math.max(4, Math.round((count / max) * 80));
          const [yr, mo] = ym.split("-");
          const label = new Date(Number(yr), Number(mo) - 1).toLocaleString("default", { month: "short" });
          return (
            <div
              key={ym}
              title={`${ym}: ${count} visits`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
            >
              <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", fontWeight: 600 }}>{count}</span>
              <div
                style={{
                  width: "100%",
                  height: h,
                  background: "var(--link-color)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────
export default function VisitsDashboardPage() {
  const navigate = useNavigate();

  const { data: visits = [], isLoading: visLoading } = useQuery<KutirVisit[]>({
    queryKey: ["visits-all"],
    queryFn: () => listVisits({}),
  });

  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
  });

  const kutirMap = useMemo(() => {
    const m: Record<number, string> = {};
    kutirs.forEach((k: any) => { m[k.id] = k.name; });
    return m;
  }, [kutirs]);

  const now = new Date();
  const thisYear = now.getFullYear().toString();
  const thisMonth = `${thisYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const total = visits.length;
    const yearVisits = visits.filter((v) => v.visit_date.startsWith(thisYear)).length;
    const monthVisits = visits.filter((v) => v.visit_date.startsWith(thisMonth)).length;
    const uniqueKutirs = new Set(visits.map((v) => v.kutir_id)).size;

    const ratingFields: (keyof KutirVisit)[] = [
      "kutir_performance", "cleanliness", "material_management",
      "hindi_proficiency", "english_proficiency", "maths_proficiency",
      "evs_proficiency", "reasoning_proficiency",
    ];
    const ratings: Record<string, number> = {};
    ratingFields.forEach((f) => {
      ratings[f as string] = avg(visits.map((v) => v[f] as number).filter(Boolean));
    });

    const timetableYes = visits.filter((v) => v.follow_timetable).length;
    const planYes = visits.filter((v) => v.follow_monthly_plan).length;

    const wbSlices = [
      { label: "Upto Date",         count: visits.filter((v) => v.workbook_completion === "Upto Date").length,         color: "var(--status-success-fg)" },
      { label: "Partial Upto Date", count: visits.filter((v) => v.workbook_completion === "Partial Upto Date").length, color: "var(--star-active)" },
      { label: "Not Upto Date",     count: visits.filter((v) => v.workbook_completion === "Not Uptodate").length,      color: "var(--status-danger-fg)" },
    ];

    const physSlices = [
      { label: "Matched",     count: visits.filter((v) => v.physical_vs_registered === "Matched").length,     color: "var(--status-success-fg)" },
      { label: "Not Matched", count: visits.filter((v) => v.physical_vs_registered === "Not Matched").length, color: "var(--status-danger-fg)" },
    ];

    const bookSlices = [
      { label: "Sufficient",         count: visits.filter((v) => v.book_availability === "Sufficient").length,         color: "var(--status-success-fg)" },
      { label: "Lacking",            count: visits.filter((v) => v.book_availability === "Lacking").length,            color: "var(--status-danger-fg)" },
      { label: "More than required", count: visits.filter((v) => v.book_availability === "More than required").length, color: "var(--badge-sky-fg)" },
    ];

    // top 5 kutirs by avg kutir_performance
    const kutirScores: Record<number, number[]> = {};
    visits.forEach((v) => {
      if (!kutirScores[v.kutir_id]) kutirScores[v.kutir_id] = [];
      kutirScores[v.kutir_id].push(v.kutir_performance);
    });
    const topKutirs = Object.entries(kutirScores)
      .map(([id, scores]) => ({ id: Number(id), avg: avg(scores), count: scores.length }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return { total, yearVisits, monthVisits, uniqueKutirs, ratings, timetableYes, planYes, wbSlices, physSlices, bookSlices, topKutirs };
  }, [visits, thisYear, thisMonth]);

  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
  };
  const section: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--link-color)",
    marginBottom: 16,
  };

  if (visLoading) {
    return (
      <div className="grs-page" style={{ padding: "32px 24px", color: "var(--text-secondary)" }}>
        Loading visits…
      </div>
    );
  }

  return (
    <div className="grs-page" style={{ padding: "28px 24px", maxWidth: 1100 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Kutir Visits Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Summary and progress across all kutir visits
          </p>
        </div>
        <button
          onClick={() => navigate("/visits/detail")}
          style={{
            background: "var(--text-primary)",
            color: "var(--chip-active-text)",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          View Details
        </button>
      </div>

      {/* stat tiles */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total Visits"         value={stats.total}         accent="var(--link-color)" />
        <StatCard label="This Year"            value={stats.yearVisits}    sub={thisYear}                    accent="#38a169" />
        <StatCard label="This Month"           value={stats.monthVisits}   sub={new Date().toLocaleString("default", { month: "long" })} accent="#dd6b20" />
        <StatCard label="Kutirs Visited"       value={stats.uniqueKutirs}  sub="unique kutirs"               accent="#805ad5" />
        <StatCard label="Avg Performance"      value={stats.total ? stats.ratings["kutir_performance"].toFixed(1) : "–"} sub="out of 5" accent="#d69e2e" />
      </div>

      {/* visits over time */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={section}>Visits Over Time</div>
        <MonthlyChart visits={visits} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 20 }}>
        {/* ratings */}
        <div style={card}>
          <div style={section}>Average Ratings</div>
          <RatingBar label="Kutir Performance"   value={stats.ratings["kutir_performance"]} />
          <RatingBar label="Cleanliness"         value={stats.ratings["cleanliness"]} />
          <RatingBar label="Material Management" value={stats.ratings["material_management"]} />
          <RatingBar label="Hindi Proficiency"   value={stats.ratings["hindi_proficiency"]} />
          <RatingBar label="English Proficiency" value={stats.ratings["english_proficiency"]} />
          <RatingBar label="Maths Proficiency"   value={stats.ratings["maths_proficiency"]} />
          <RatingBar label="EVS Proficiency"     value={stats.ratings["evs_proficiency"]} />
          <RatingBar label="Reasoning"           value={stats.ratings["reasoning_proficiency"]} />
        </div>

        {/* compliance */}
        <div style={card}>
          <div style={section}>Compliance</div>
          {/* timetable */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Following Timetable</span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{pct(stats.timetableYes, stats.total)}%</span>
            </div>
            <div style={{ height: 10, background: "var(--bg-input)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${pct(stats.timetableYes, stats.total)}%`, height: "100%", background: "var(--status-success-fg)", borderRadius: 5 }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
              {stats.timetableYes} of {stats.total} visits
            </div>
          </div>
          {/* monthly plan */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Following Monthly Plan</span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{pct(stats.planYes, stats.total)}%</span>
            </div>
            <div style={{ height: 10, background: "var(--bg-input)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${pct(stats.planYes, stats.total)}%`, height: "100%", background: "var(--link-color)", borderRadius: 5 }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
              {stats.planYes} of {stats.total} visits
            </div>
          </div>

          <div style={section}>Physical vs Registered</div>
          <DonutSlice slices={stats.physSlices} />
        </div>

        {/* workbook + books */}
        <div style={card}>
          <div style={section}>Workbook Completion</div>
          <DonutSlice slices={stats.wbSlices} />

          <div style={{ ...section, marginTop: 24 }}>Book Availability</div>
          <DonutSlice slices={stats.bookSlices} />
        </div>
      </div>

      {/* top kutirs */}
      {stats.topKutirs.length > 0 && (
        <div style={card}>
          <div style={section}>Top Kutirs by Performance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.topKutirs.map((k, i) => (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: i === 0 ? "var(--badge-amber-fg)" : i === 1 ? "var(--badge-grey-fg)" : i === 2 ? "var(--badge-amber-fg)" : "var(--border)",
                  color: i < 3 ? "var(--chip-active-text)" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {kutirMap[k.id] ?? `Kutir #${k.id}`}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{k.count} visit{k.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Star v={k.avg} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", minWidth: 28 }}>
                    {k.avg.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
