/**
 * Build guard: pipeline stage order + Pipeline Stages sheet field visibility matrix.
 * Must stay aligned with frontend/src/components/admissions-pipeline.tsx
 */
const STAGES = [
  "eligible",
  "applied",
  "admit_card",
  "appeared",
  "result_declared",
  "selected",
  "admitted",
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((k, i) => [k, i]));

/** Yes/No matrix from Pipeline Stages.xlsx (blank = No). */
const MATRIX = {
  year: ["eligible", "applied", "admit_card", "appeared", "result_declared", "selected", "admitted"],
  exam_type: ["eligible", "applied", "admit_card", "appeared", "result_declared", "selected", "admitted"],
  exam_category: ["eligible", "applied", "admit_card", "appeared", "result_declared", "selected", "admitted"],
  parivaar_district: ["admit_card", "appeared", "result_declared", "selected", "admitted"],
  exam_center: ["admit_card", "appeared", "result_declared", "selected", "admitted"],
  application_number: ["applied", "admit_card", "appeared", "result_declared", "selected", "admitted"],
  roll_number: ["admit_card", "appeared", "result_declared", "selected", "admitted"],
  reason_not_appeared: ["admit_card"],
  scores: ["result_declared", "selected", "admitted"],
  school_district: ["result_declared", "selected", "admitted"],
  school_type: ["result_declared", "selected", "admitted"],
  school_name: ["result_declared", "selected", "admitted"],
  reason_not_admitted: ["selected"],
};

function pipelineStage(exam) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (exam[STAGES[i]]) return i;
  }
  return -1;
}

function fieldVisible(exam, field) {
  const allowed = MATRIX[field];
  if (!allowed) throw new Error(`unknown field ${field}`);
  const idx = pipelineStage(exam);
  if (idx < 0) return false;
  const key = STAGES[idx];
  return allowed.includes(key);
}

function examAt(stageKey) {
  const idx = STAGE_INDEX[stageKey];
  const exam = Object.fromEntries(STAGES.map((k, i) => [k, i <= idx]));
  return exam;
}

for (const field of Object.keys(MATRIX)) {
  for (const stageKey of STAGES) {
    const exam = examAt(stageKey);
    const expect = MATRIX[field].includes(stageKey);
    const got = fieldVisible(exam, field);
    if (got !== expect) {
      console.error(
        `pipeline visibility ${field} @ ${stageKey}: expected ${expect}, got ${got}`,
      );
      process.exit(1);
    }
  }
}

function normalizePipelineStages(exam) {
  let max = -1;
  for (let i = 0; i < STAGES.length; i++) {
    if (exam[STAGES[i]]) max = i;
  }
  const next = { ...exam };
  for (let i = 0; i < STAGES.length; i++) {
    next[STAGES[i]] = i <= max;
  }
  return next;
}

const preserved = normalizePipelineStages({
  school_start_year: 2025,
  eligible: false,
  applied: false,
  admit_card: false,
  appeared: false,
  result_declared: false,
  selected: false,
  admitted: false,
});
if (preserved.school_start_year !== 2025) {
  console.error("normalizePipelineStages must preserve unrelated keys");
  process.exit(1);
}

console.log("Pipeline stages matrix OK.");
