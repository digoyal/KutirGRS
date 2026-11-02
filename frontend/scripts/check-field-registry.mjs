/**
 * Build-time guard: list-page column keys must match frontend/src/constants/*Fields.ts.
 * See docs/kutirgrs.md § Field registry and AGENTS.md Field registry.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** GrsTable row actions — not part of Column Settings / field registry. */
const EXCLUDED_LIST_COLUMN_KEYS = new Set(["actions"]);

const ENTITIES = [
  { entity: "students", fields: "src/constants/studentsFields.ts", page: "src/pages/StudentsPage.tsx", mode: "renderers" },
  { entity: "kutirs", fields: "src/constants/kutirsFields.ts", page: "src/pages/KutirsPage.tsx", mode: "renderers" },
  { entity: "admissions", fields: "src/constants/admissionsFields.ts", page: "src/pages/AdmissionsPage.tsx", mode: "allColumns" },
  { entity: "progress", fields: "src/constants/progressFields.ts", page: "src/pages/StudentProgressPage.tsx", mode: "progressCases" },
  { entity: "visits", fields: "src/constants/visitsFields.ts", page: "src/pages/VisitsPage.tsx", mode: "allColumns" },
  { entity: "schools", fields: "src/constants/schoolsFields.ts", page: "src/pages/SchoolsPage.tsx", mode: "renderers" },
  { entity: "examcenters", fields: "src/constants/examCentersFields.ts", page: "src/pages/ExamCentersPage.tsx", mode: "renderers" },
  { entity: "users", fields: "src/constants/usersFields.ts", page: "src/pages/UsersPage.tsx", mode: "renderers" },
];

function read(relPath) {
  return fs.readFileSync(path.join(frontendRoot, relPath), "utf8");
}

function parseRegistryKeys(fieldsRelPath) {
  const text = read(fieldsRelPath);
  const keys = [];
  const re = /\{\s*key:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) keys.push(m[1]);
  const unique = new Set(keys);
  if (unique.size !== keys.length) {
    throw new Error(`${fieldsRelPath}: duplicate keys in *_FIELDS`);
  }
  return keys;
}

/** Top-level keys in `const renderers = { ... }` (4-space indent). */
function extractRendererKeys(pageRelPath) {
  const text = read(pageRelPath);
  const fnMatch = text.match(
    /function \w+ColRenderers[\s\S]*?const renderers[^=]*=\s*\{([\s\S]*?)\n\s*\};\s*\n\s*if \(import\.meta\.env\.DEV\)/,
  );
  if (!fnMatch) {
    throw new Error(`${pageRelPath}: could not find *ColRenderers registry block`);
  }
  const keys = [];
  for (const line of fnMatch[1].split("\n")) {
    const km = line.match(/^    ([a-zA-Z_][a-zA-Z0-9_]*):\s*\{/);
    if (km) keys.push(km[1]);
  }
  return keys;
}

function extractAllColumnKeys(pageRelPath) {
  const text = read(pageRelPath);
  const start = text.indexOf("const allColumns = useMemo");
  if (start < 0) {
    throw new Error(`${pageRelPath}: const allColumns = useMemo not found`);
  }
  const slice = text.slice(start, start + 30000);
  const end = slice.search(/\],\s*\n\s*\[/);
  const block = end > 0 ? slice.slice(0, end) : slice;
  const keys = new Set();
  const re = /key:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block))) keys.add(m[1]);
  const spread = block.match(/\(\[(.*?)\]\s*as const\)\.map/);
  if (spread) {
    for (const sm of spread[1].matchAll(/"([^"]+)"/g)) keys.add(sm[1]);
  }
  return [...keys];
}

function extractProgressCaseKeys(pageRelPath) {
  const text = read(pageRelPath);
  const start = text.indexOf("const columns = useMemo");
  if (start < 0) {
    throw new Error(`${pageRelPath}: progress columns useMemo not found`);
  }
  const slice = text.slice(start, start + 14000);
  const keys = new Set();
  for (const m of slice.matchAll(/case "([^"]+)":/g)) keys.add(m[1]);
  return [...keys];
}

function listColumnKeys(entity) {
  switch (entity.mode) {
    case "renderers":
      return extractRendererKeys(entity.page);
    case "allColumns":
      return extractAllColumnKeys(entity.page);
    case "progressCases":
      return extractProgressCaseKeys(entity.page);
    default:
      throw new Error(`Unknown mode: ${entity.mode}`);
  }
}

let failed = false;

for (const entity of ENTITIES) {
  const registry = parseRegistryKeys(entity.fields);
  const columns = listColumnKeys(entity).filter((k) => !EXCLUDED_LIST_COLUMN_KEYS.has(k));

  const missingRenderer = registry.filter((k) => !columns.includes(k));
  const notInRegistry = columns.filter((k) => !registry.includes(k));

  if (missingRenderer.length || notInRegistry.length) {
    failed = true;
    console.error(`\n[field-registry] ${entity.entity}:`);
    if (missingRenderer.length) {
      console.error(`  registry keys missing list renderer/column: ${missingRenderer.join(", ")}`);
    }
    if (notInRegistry.length) {
      console.error(`  list column keys not in registry: ${notInRegistry.join(", ")}`);
    }
  }
}

if (failed) {
  console.error("\nField registry check failed. Add keys to frontend/src/constants/*Fields.ts first, then wire the list page.");
  process.exit(1);
}

console.log(`Field registry OK (${ENTITIES.length} entities).`);
