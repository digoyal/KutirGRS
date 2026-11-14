export interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

export function FunnelBar({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s) => {
        const pct = max > 0 ? (s.count / max) * 100 : 0;
        return (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 110,
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                flex: 1,
                background: "var(--bg-input)",
                borderRadius: 4,
                height: 22,
                overflow: "hidden",
              }}
            >
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
            <div
              style={{
                width: 36,
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {max > 0 ? Math.round(pct) : 0}%
            </div>
          </div>
        );
      })}
    </div>
  );
}