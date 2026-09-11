import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

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

  const { data: students = [] } = useQuery({
    queryKey: ["students-all"],
    queryFn: async () => (await api.get("/students", { params: { limit: 5000 } })).data as any[],
  });

  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"],
    queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data as any[],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["visits-recent"],
    queryFn: async () => (await api.get("/kutir-visits", { params: { limit: 10 } })).data as any[],
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-current"],
    queryFn: async () =>
      (await api.get("/student-exams", { params: { school_start_year: currentYear, limit: 2000 } })).data as any[],
  });

  // Funnel counts
  const funnelStages: FunnelStage[] = [
    { label: "Eligible", count: exams.filter((e) => e.eligible).length, color: "var(--badge-sky-fg)" },
    { label: "Form Received", count: exams.filter((e) => e.form_received).length, color: "var(--badge-sky-fg)" },
    { label: "Applied", count: exams.filter((e) => e.applied).length, color: "var(--link-color)" },
    { label: "Appeared", count: exams.filter((e) => e.appeared).length, color: "var(--link-color)" },
    { label: "Selected", count: exams.filter((e) => e.selected).length, color: "var(--status-success-fg)" },
    { label: "Admitted", count: exams.filter((e) => e.admitted).length, color: "var(--status-success-fg)" },
  ];

  const statCards: StatCard[] = [
    {
      label: "Total Students",
      value: students.length,
      sub: "enrolled in kutirs",
      color: "var(--text-primary)",
      bg: "var(--badge-blue-bg)",
      icon: "👦",
    },
    {
      label: "Active Kutirs",
      value: kutirs.length,
      sub: "centres",
      color: "var(--status-success-fg)",
      bg: "var(--status-success-bg)",
      icon: "🏫",
    },
    {
      label: `Admissions ${currentYear}`,
      value: exams.length,
      sub: `${exams.filter((e) => e.admitted).length} admitted`,
      color: "var(--badge-amber-fg)",
      bg: "var(--badge-amber-bg)",
      icon: "📋",
    },
    {
      label: "Visits Logged",
      value: visits.length,
      sub: "total records",
      color: "var(--badge-purple-fg)",
      bg: "var(--badge-purple-bg)",
      icon: "🔍",
    },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960 }}>
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
        {exams.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No exam records for {currentYear} yet.</p>
        ) : (
          <FunnelBar stages={funnelStages} />
        )}
      </div>
    </div>
  );
}
