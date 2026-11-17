/**
 * Build guard: Admission Add — checking Eligible must satisfy pipeline stage
 * and client validation must advance past stage (e.g. student), not repeat stage.
 * Mirrors AdmissionsForm.tsx + admissions-pipeline.tsx (no TS import).
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

const PIPELINE_STAGE_REQUIRED_MSG =
  "Pipeline stage is required (select at least Eligible).";

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

function pipelineStage(exam) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (exam[STAGES[i]]) return i;
  }
  return -1;
}

function admissionStageFlags(form) {
  return normalizePipelineStages({
    eligible: form.eligible,
    applied: form.applied,
    admit_card: form.admit_card,
    appeared: form.appeared,
    result_declared: form.result_declared,
    selected: form.selected,
    admitted: form.admitted,
  });
}

function mergePipelineStageToggle(current, updates) {
  return normalizePipelineStages({ ...current, ...updates });
}

function toggleStageFields(f, updates) {
  return {
    ...f,
    ...mergePipelineStageToggle(admissionStageFlags(f), updates),
  };
}

/** First validation error (subset of validateAdmissionForm — stage + add student/class). */
function validateAdmissionFormAdd(form) {
  const stageFlags = admissionStageFlags(form);
  if (pipelineStage(stageFlags) < 0) {
    return PIPELINE_STAGE_REQUIRED_MSG;
  }
  if (!form.student_id) {
    return "Select a student.";
  }
  if (form.admission_class == null) {
    return "Class is required (select 5 or 8).";
  }
  return null;
}

const emptyAdd = {
  student_id: 0,
  school_start_year: 2026,
  admission_class: null,
  eligible: false,
  applied: false,
  admit_card: false,
  appeared: false,
  result_declared: false,
  selected: false,
  admitted: false,
};

const eligibleOnlyFlags = { eligible: true, applied: false, admit_card: false, appeared: false, result_declared: false, selected: false, admitted: false };
if (pipelineStage(eligibleOnlyFlags) !== 0) {
  console.error("pipelineStage({eligible:true,...}) must be 0");
  process.exit(1);
}

const noStageErr = validateAdmissionFormAdd(emptyAdd);
if (noStageErr !== PIPELINE_STAGE_REQUIRED_MSG) {
  console.error(`empty add: expected stage required, got ${JSON.stringify(noStageErr)}`);
  process.exit(1);
}

const withEligible = toggleStageFields(emptyAdd, { eligible: true });
if (pipelineStage(admissionStageFlags(withEligible)) !== 0 || !withEligible.eligible) {
  console.error("toggle Eligible must set contiguous stage index 0");
  process.exit(1);
}
if (withEligible.school_start_year !== 2026) {
  console.error("toggleStage must preserve school_start_year");
  process.exit(1);
}

const afterEligibleErr = validateAdmissionFormAdd(withEligible);
if (afterEligibleErr === PIPELINE_STAGE_REQUIRED_MSG) {
  console.error("with Eligible only: must not repeat pipeline stage error");
  process.exit(1);
}
if (afterEligibleErr !== "Select a student.") {
  console.error(
    `with Eligible only: expected student error, got ${JSON.stringify(afterEligibleErr)}`,
  );
  process.exit(1);
}

console.log("Admission stage validation OK.");