// Shared pipeline helpers for Admissions pages
import type { StudentExam } from "../api/admissions";
import type { ExamTypeSubjectRow, SubjectRef } from "../api/admissions";

export const STAGES = [
  { key: "eligible",   label: "Eligible" },
  { key: "applied",    label: "Applied" },
  { key: "admit_card", label: "Admit Card Downloaded" },
  { key: "appeared",   label: "Appeared" },
  { key: "selected",   label: "Selected" },
  { key: "admitted",   label: "Admitted" },
] as const;

export type StageKey = typeof STAGES[number]["key"];

export function subjectsForExamType(rows: ExamTypeSubjectRow[], examTypeId: number | null | undefined): SubjectRef[] {
  if (!examTypeId) return [];
  return rows.find(r => r.id === examTypeId)?.subjects ?? [];
}

export function pipelineStage(exam: StudentExam): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (exam[STAGES[i].key as StageKey]) return i;
  }
  return -1;
}

export function StageBadge({ exam }: { exam: StudentExam }) {
  const idx = pipelineStage(exam);
  if (idx < 0) {
    return (
      <span style={{
        background: "var(--badge-grey-bg)", color: "var(--badge-grey-fg)",
        padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
      }}>Registered</span>
    );
  }
  const colors: Record<number, { bg: string; color: string }> = {
    0: { bg: "var(--badge-sky-bg)",    color: "var(--badge-sky-fg)"    },
    1: { bg: "var(--badge-indigo-bg)", color: "var(--badge-indigo-fg)" },
    2: { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-fg)" },
    3: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
    4: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
  };
  const { bg, color } = colors[idx] ?? colors[0];
  return (
    <span style={{
      background: bg, color,
      padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.02em",
    }}>{STAGES[idx].label}</span>
  );
}

export function PipelineStepper({ exam, onChange }: {
  exam: StudentExam;
  onChange: (updates: Partial<Record<StageKey, boolean>>) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
      {STAGES.map((stage, i) => {
        const done = exam[stage.key as StageKey] as boolean;
        return (
          <label key={stage.key} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
            {i > 0 && <span style={{ color: "var(--border)", margin: "0 4px" }}>›</span>}
            <input
              type="checkbox"
              checked={done}
              onChange={e => {
                const updates: Partial<Record<StageKey, boolean>> = {};
                if (e.target.checked) {
                  STAGES.slice(0, i + 1).forEach(s => { updates[s.key as StageKey] = true; });
                } else {
                  STAGES.slice(i).forEach(s => { updates[s.key as StageKey] = false; });
                }
                onChange(updates);
              }}
              style={{ accentColor: "var(--link-color)" }}
            />
            <span style={{ color: done ? "var(--badge-sky-fg)" : "var(--text-secondary)", fontWeight: done ? 600 : 400 }}>
              {stage.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
