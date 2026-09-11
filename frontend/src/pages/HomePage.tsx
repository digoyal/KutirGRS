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
            <div style={{ width: 110, fontSize: "0.8rem", color: "#4a5568", textAlign: "right", flexShrink: 0 }}>
              {s.label}
            </div>
            <div style={{ flex: 1, background: "#f0f4f8", borderRadius: 4, height: 22, overflow: "hidden" }}>
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
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>{s.count}</span>
                )}
              </div>
            </div>
            <div style={{ width: 36, fontSize: "0.8rem", color: "#718096", textAlign: "right", flexShrink: 0 }}>
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
        color: "#4a6fa5",
        borderBottom: "2px solid #bee3f8",
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

  const { data: kutirMap } = useQuery({
    queryKey: ["kutirs-map"],
    queryFn: async () => {
      const list = (await api.get("/kutirs", { params: { limit: 500 } })).data as any[];
      return new Map(list.map((k: any) => [k.id, k]));
    },
  });

  // Funnel counts
  const funnelStages: FunnelStage[] = [
    { label: "Eligible", count: exams.filter((e) => e.eligible).length, color: "#63b3ed" },
    { label: "Form Received", count: exams.filter((e) => e.form_received).length, color: "#4299e1" },
    { label: "Applied", count: exams.filter((e) => e.applied).length, color: "#3182ce" },
    { label: "Appeared", count: exams.filter((e) => e.appeared).length, color: "#2b6cb0" },
    { label: "Selected", count: exams.filter((e) => e.selected).length, color: "#276749" },
    { label: "Admitted", count: exams.filter((e) => e.admitted).length, color: "#22543d" },
  ];

  const recentVisits = [...visits]
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
    .slice(0, 8);

  const statCards: StatCard[] = [
    {
      label: "Total Students",
      value: students.length,
      sub: "enrolled in kutirs",
      color: "#1a365d",
      bg: "#ebf4ff",
      icon: "👦",
    },
    {
      label: "Active Kutirs",
      value: kutirs.length,
      sub: "centres",
      color: "#276749",
      bg: "#f0fff4",
      icon: "🏫",
    },
    {
      label: `Admissions ${currentYear}`,
      value: exams.length,
      sub: `${exams.filter((e) => e.admitted).length} admitted`,
      color: "#744210",
      bg: "#fffaf0",
      icon: "📋",
    },
    {
      label: "Visits Logged",
      value: visits.length,
      sub: "total records",
      color: "#553c9a",
      bg: "#faf5ff",
      icon: "🔍",
    },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, color: "#1a365d", fontSize: "1.35rem" }}>
          Welcome back, {user?.username}
        </h2>
        <p style={{ color: "#718096", margin: "4px 0 0", fontSize: "0.9rem" }}>
          {user?.title} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
        {statCards.map((c) => (
          <Card key={c.label} {...c} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* Admission funnel */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <SectionTitle>Admission Funnel — {currentYear}</SectionTitle>
          {exams.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: "0.85rem" }}>No exam records for {currentYear} yet.</p>
          ) : (
            <FunnelBar stages={funnelStages} />
          )}
        </div>

        {/* Recent visits */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <SectionTitle>Recent Visits</SectionTitle>
          {recentVisits.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: "0.85rem" }}>No visits recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {recentVisits.map((v, i) => {
                const kutir = kutirMap?.get(v.kutir_id);
                return (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: i < recentVisits.length - 1 ? "1px solid #f0f4f8" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#2d3748" }}>
                        {kutir?.name ?? `Kutir #${v.kutir_id}`}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#718096" }}>
                        {new Date(v.visit_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f6ad55" }}>
                        {"★".repeat(v.kutir_performance)}
                        {"☆".repeat(5 - v.kutir_performance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
