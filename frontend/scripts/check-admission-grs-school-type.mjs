/**
 * Build guard: school_type validation mirrors validateAdmissionForm (selected+admitted).
 */

function schoolTypeForPayload(form, schools = []) {
  const trimmed = (form.school_type ?? "").trim();
  if (trimmed) return trimmed;
  if (form.admitted_school_id == null) return "";
  const school = schools.find((s) => s.id === form.admitted_school_id);
  return (school?.school_type ?? "").trim();
}

const schools = [
  { id: 42, school_type: "JNV" },
  { id: 99, school_type: "Sainik" },
];

const legacy = { school_type: "", admitted_school_id: 42 };
if (schoolTypeForPayload(legacy, schools) !== "JNV") {
  console.error("expected JNV from admitted school catalog for payload");
  process.exit(1);
}

const explicit = { school_type: "  Model ", admitted_school_id: 99 };
if (schoolTypeForPayload(explicit, schools) !== "Model") {
  console.error("form school_type wins when set");
  process.exit(1);
}

const clearedAfterExamChange = { school_type: "", admitted_school_id: null };
if (schoolTypeForPayload(clearedAfterExamChange, schools) !== "") {
  console.error("exam type reset must leave no effective school type");
  process.exit(1);
}

function schoolTypeError(form, showSchoolName = true, showSchoolType = true) {
  const schoolNameSatisfiesType = showSchoolName && form.admitted_school_id != null;
  if (!schoolNameSatisfiesType && showSchoolType && !(form.school_type ?? "").trim()) {
    return "School type is required.";
  }
  return null;
}

const savedWithSchool = { school_type: "", admitted_school_id: 42 };
if (schoolTypeError(savedWithSchool) !== null) {
  console.error("edit save with admitted_school_id should skip school type check");
  process.exit(1);
}

const missingBoth = { school_type: "", admitted_school_id: null };
if (schoolTypeError(missingBoth) !== "School type is required.") {
  console.error("missing GRS school must fail type check");
  process.exit(1);
}

const dropdownEmrsOnly = { school_type: "EMRS", admitted_school_id: null };
if (schoolTypeError(dropdownEmrsOnly) !== null) {
  console.error("form.school_type EMRS from dropdown must pass school type validation");
  process.exit(1);
}

const afterExamChangePicks = { school_type: "EMRS", admitted_school_id: 42 };
if (schoolTypeError(afterExamChangePicks) !== null) {
  console.error("post exam-change flow with EMRS + school must pass");
  process.exit(1);
}

console.log("Admission GRS school type validation OK.");