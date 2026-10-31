import { useQuery } from "@tanstack/react-query";
import { getAdmissionFunnel } from "../api/admissions";
import { listKutirsPaged } from "../api/kutirs";
import { listStudentsPaged } from "../api/students";
import { listVisitsPaged } from "../api/visits";
import { STAGES, FUNNEL_STAGE_LABELS, type StageKey } from "../components/admissions-pipeline";
import { useAuth } from "../context/AuthContext";

const FUNNEL_COLORS: Record<StageKey, string> = {
  eligible: "var(--badge-sky-fg)",
  applied: "var(--link-color)",
  admit_card: "var(--badge-amber-fg)",
  appeared: "var(--link-color)",
  selected: "var(--status-success-fg)",
  admitted: "var(--status-success-fg)",
};

interface StatCard {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bg: string;
  icon: string;
}

function Card({ label, value, sub, color, bg, icon }: StatCard) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          lineHeight: 1,
          background: "rgba(255,255,255,0.6)",
          borderRadius: 8,
          width: 52,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color, opacity: 0.85, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: "0.75rem", color, opacity: 0.65, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

function FunnelBar({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s) => {
        const pct = max > 0 ? (s.count / max) * 100 : 0;
        return (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 110, fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>
              {s.label}
            </div>
            <div style={{ flex: 1, background: "var(--bg-input)", borderRadius: 4, height: 22, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  minWidth: s.count > 0 ? 32 : 0,
                  height: "100%",
                  background: s.color,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  transition: "width 0.4s",
                }}
              >
                {s.count > 0 && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>{s.count}</span>
                )}
              </div>
            </div>
            <div style={{ width: 36, fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>
              {max > 0 ? Math.round(pct) : 0}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--link-color)",
        borderBottom: "2px solid var(--badge-blue-bg)",
        paddingBottom: 6,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const { data: studentTotal = 0 } = useQuery({
    queryKey: ["home-student-count"],
    queryFn: async () => (await listStudentsPaged({ limit: 1 })).total,
  });

  const { data: kutirTotal = 0 } = useQuery({
    queryKey: ["home-kutir-count"],
    queryFn: async () => (await listKutirsPaged({ limit: 1 })).total,
  });

  const { data: visitTotal = 0 } = useQuery({
    queryKey: ["home-visit-count"],
    queryFn: async () => (await listVisitsPaged({ limit: 1 })).total,
  });

  const { data: funnel } = useQuery({
    queryKey: ["admission-funnel", currentYear],
    queryFn: () => getAdmissionFunnel({ school_start_year: currentYear }),
  });

  // Same six stages as Reports Summary / admissions-pipeline STAGES
  const funnelStages: FunnelStage[] = STAGES.map((s) => ({
    label: FUNNEL_STAGE_LABELS[s.key],
    count: funnel?.[s.key] ?? 0,
    color: FUNNEL_COLORS[s.key],
  }));

  const statCards: StatCard[] = [
    {
      label: "Total Students",
      value: studentTotal,
      sub: "enrolled in kutirs",
      color: "var(--text-primary)",
      bg: "var(--badge-blue-bg)",
      icon: "👦",
    },
    {
      label: "Active Kutirs",
      value: kutirTotal,
      sub: "centres",
      color: "var(--status-success-fg)",
      bg: "var(--status-success-bg)",
      icon: "🏫",
    },
    {
      label: `Admissions ${currentYear}`,
      value: funnel?.total ?? 0,
      sub: `${funnel?.admitted ?? 0} admitted`,
      color: "var(--badge-amber-fg)",
      bg: "var(--badge-amber-bg)",
      icon: "📋",
    },
    {
      label: "Visits Logged",
      value: visitTotal,
      sub: "total records",
      color: "var(--badge-purple-fg)",
      bg: "var(--badge-purple-bg)",
      icon: "🔍",
    },
  ];

  return (
    <div className="grs-page" style={{ padding: "28px 32px", maxWidth: 960, width: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.35rem" }}>
          Welcome back, {user?.username}
        </h2>
        <p style={{ color: "var(--text-secondary)", margin: "4px 0 0", fontSize: "0.9rem" }}>
          {user?.title} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
        {statCards.map((c) => (
          <Card key={c.label} {...c} />
        ))}
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <SectionTitle>Admission Funnel — {currentYear}</SectionTitle>
        {!funnel || funnel.total === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No exam records for {currentYear} yet.</p>
        ) : (
          <FunnelBar stages={funnelStages} />
        )}
      </div>
    </div>
  );
}
