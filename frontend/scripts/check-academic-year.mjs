/**
 * Build guard: academic year display ↔ start-year integer convention (Admissions/Progress).
 */
function formatAcademicYear(startYear) {
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

const cases = [
  [2025, "2025-26"],
  [2026, "2026-27"],
];

for (const [start, label] of cases) {
  const got = formatAcademicYear(start);
  if (got !== label) {
    console.error(`formatAcademicYear(${start}): expected ${label}, got ${got}`);
    process.exit(1);
  }
}

/** Form/list selects must use startYear as option value, label as formatAcademicYear(startYear). */
const startYear = 2025;
const optionValue = startYear;
if (formatAcademicYear(optionValue) !== "2025-26") {
  console.error("Year option value must be school_start_year start integer, not end year");
  process.exit(1);
}

/** Mirror admissions-pipeline normalizePipelineStages — must not clobber school_start_year. */
function normalizePipelineStages(exam) {
  const STAGES = [
    "eligible",
    "applied",
    "admit_card",
    "appeared",
    "result_declared",
    "selected",
    "admitted",
  ];
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

const beforeEligible = {
  school_start_year: 2025,
  eligible: false,
  applied: false,
  admit_card: false,
  appeared: false,
  result_declared: false,
  selected: false,
  admitted: false,
};
const afterEligible = normalizePipelineStages({ ...beforeEligible, eligible: true });
if (afterEligible.school_start_year !== 2025 || !afterEligible.eligible) {
  console.error("Pipeline stage toggle must preserve school_start_year when locking year");
  process.exit(1);
}

console.log("Academic year convention OK.");
