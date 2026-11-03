// Shared pipeline helpers for Admissions pages
import type { StudentExam } from "../api/admissions";
import type { ExamTypeSubjectRow, SubjectRef } from "../api/admissions";

export const STAGES = [
  { key: "eligible",         label: "Eligible" },
  { key: "applied",          label: "Applied" },
  { key: "admit_card",       label: "Admin Card Downloaded" },
  { key: "appeared",         label: "Appeared" },
  { key: "result_declared",  label: "Result Declared" },
  { key: "selected",         label: "Selected" },
  { key: "admitted",         label: "Admitted" },
] as const;

export type StageKey = typeof STAGES[number]["key"];

/** Short labels for Home / Reports Summary funnel (same keys/order as STAGES). */
export const FUNNEL_STAGE_LABELS: Record<StageKey, string> = {
  eligible: "Eligible",
  applied: "Applied",
  admit_card: "Admin Card",
  appeared: "Appeared",
  result_declared: "Result Declared",
  selected: "Selected",
  admitted: "Admitted",
};

export function subjectsForExamType(rows: ExamTypeSubjectRow[], examTypeId: number | null | undefined): SubjectRef[] {
  if (!examTypeId) return [];
  return rows.find(r => r.id === examTypeId)?.subjects ?? [];
}

export function pipelineStage(exam: Pick<StudentExam, StageKey>): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (exam[STAGES[i].key as StageKey]) return i;
  }
  return -1;
}

/** Contiguous prefix: fill every stage up to the furthest true one; clear the rest. */
export function normalizePipelineStages<T extends Pick<StudentExam, StageKey>>(exam: T): T {
  let max = -1;
  for (let i = 0; i < STAGES.length; i++) {
    if (exam[STAGES[i].key as StageKey]) max = i;
  }
  const next = { ...exam };
  for (let i = 0; i < STAGES.length; i++) {
    (next as Record<StageKey, boolean>)[STAGES[i].key as StageKey] = i <= max;
  }
  return next;
}

/** Spreadsheet "Admin Card Downloaded" ↔ stage key `admit_card`. */
export type PipelineField =
  | "year"
  | "exam_type"
  | "exam_category"
  | "parivaar_district"
  | "exam_center"
  | "application_number"
  | "roll_number"
  | "reason_not_appeared"
  | "scores"
  | "school_district"
  | "school_type"
  | "school_name"
  | "reason_not_admitted";

type FieldRule = { kind: "min"; stage: StageKey } | { kind: "only"; stage: StageKey };

const STAGE_INDEX: Record<StageKey, number> = {
  eligible: 0,
  applied: 1,
  admit_card: 2,
  appeared: 3,
  result_declared: 4,
  selected: 5,
  admitted: 6,
};

/** Pipeline Stages.xlsx — Yes = show when furthest stage is at least min, or exactly only. */
const PIPELINE_FIELD_RULES: Record<PipelineField, FieldRule> = {
  year: { kind: "min", stage: "eligible" },
  exam_type: { kind: "min", stage: "eligible" },
  exam_category: { kind: "min", stage: "eligible" },
  parivaar_district: { kind: "min", stage: "admit_card" },
  exam_center: { kind: "min", stage: "admit_card" },
  application_number: { kind: "min", stage: "applied" },
  roll_number: { kind: "min", stage: "admit_card" },
  reason_not_appeared: { kind: "only", stage: "admit_card" },
  scores: { kind: "min", stage: "result_declared" },
  school_district: { kind: "min", stage: "result_declared" },
  school_type: { kind: "min", stage: "result_declared" },
  school_name: { kind: "min", stage: "result_declared" },
  reason_not_admitted: { kind: "only", stage: "selected" },
};

export function pipelineFieldVisible(
  exam: Pick<StudentExam, StageKey>,
  field: PipelineField,
): boolean {
  const rule = PIPELINE_FIELD_RULES[field];
  const idx = pipelineStage(exam);
  if (idx < 0) return false;
  if (rule.kind === "min") return idx >= STAGE_INDEX[rule.stage];
  return idx === STAGE_INDEX[rule.stage];
}

export function StageBadge({ exam }: { exam: StudentExam }) {
  const idx = pipelineStage(exam);
  if (idx < 0) {
    return (
      <span style={{
        background: "var(--badge-grey-bg)", color: "var(--badge-grey-fg)",
        padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
        whiteSpace: "nowrap",
      }}>Registered</span>
    );
  }
  const colors: Record<number, { bg: string; color: string }> = {
    0: { bg: "var(--badge-sky-bg)",    color: "var(--badge-sky-fg)"    },
    1: { bg: "var(--badge-indigo-bg)", color: "var(--badge-indigo-fg)" },
    2: { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-fg)" },
    3: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
    4: { bg: "var(--badge-teal-bg)",   color: "var(--badge-teal-fg)"   },
    5: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
    6: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
  };
  const { bg, color } = colors[idx] ?? colors[0];
  return (
    <span style={{
      background: bg, color,
      padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
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
        const priorsDone = STAGES.slice(0, i).every((s) => exam[s.key as StageKey]);
        // May only check a stage when every prior is already checked; uncheck always allowed.
        const canCheck = priorsDone;
        const disabled = !done && !canCheck;
        return (
          <label
            key={stage.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: disabled ? 0.55 : 1,
            }}
          >
            {i > 0 && <span style={{ color: "var(--border)", margin: "0 4px" }}>›</span>}
            <input
              type="checkbox"
              checked={done}
              disabled={disabled}
              onChange={e => {
                const updates: Partial<Record<StageKey, boolean>> = {};
                if (e.target.checked) {
                  if (!priorsDone) return;
                  // Contiguous: turn on this stage and every prior.
                  STAGES.slice(0, i + 1).forEach(s => { updates[s.key as StageKey] = true; });
                } else {
                  // Uncheck clears this stage and all later ones (no gaps).
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
