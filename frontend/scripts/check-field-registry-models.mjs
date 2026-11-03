/**
 * Build-time guard: *Fields.ts must cover user-meaningful SQLAlchemy columns
 * (not only list-page switch/renderers). Rules: field-registry-model-manifest.mjs
 * See AGENTS.md § Field registry and docs/kutirgrs.md § Field registry.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FIELD_REGISTRY_MODEL_ENTITIES } from "./field-registry-model-manifest.mjs";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(frontendRoot, "..");

function readFromFrontend(relPath) {
  return fs.readFileSync(path.join(frontendRoot, relPath), "utf8");
}

function parseRegistryKeys(fieldsRelPath) {
  const text = readFromFrontend(fieldsRelPath);
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

/** Parse mapped_column fields on a SQLAlchemy model class (+ TimestampMixin columns). */
export function extractSqlAlchemyColumns(modelRelPath, className) {
  const abs = path.join(repoRoot, modelRelPath);
  const text = fs.readFileSync(abs, "utf8");
  const marker = `class ${className}`;
  const classStart = text.indexOf(marker);
  if (classStart < 0) {
    throw new Error(`${modelRelPath}: class ${className} not found`);
  }
  const headerEnd = text.indexOf("\n", classStart);
  const header = text.slice(classStart, headerEnd + 1);
  const usesTimestamp = /TimestampMixin/.test(header);

  let bodyEnd = text.length;
  const tail = text.slice(classStart + marker.length);
  const nextClass = tail.match(/\nclass [A-Z]/);
  if (nextClass) {
    bodyEnd = classStart + marker.length + nextClass.index;
  }
  const body = text.slice(classStart, bodyEnd);
  const cols = new Set();
  const colRe = /^\s{4}([a-z][a-z0-9_]*):\s*Mapped[\s\S]*?=\s*mapped_column/gm;
  for (const m of body.matchAll(colRe)) {
    cols.add(m[1]);
  }
  if (usesTimestamp) {
    cols.add("created_at");
    cols.add("updated_at");
  }
  return [...cols].sort();
}

function expectedRegistryKey(entity, column) {
  if (entity.columnRegistryKey?.[column]) {
    return entity.columnRegistryKey[column];
  }
  return column;
}

let failed = false;

for (const entity of FIELD_REGISTRY_MODEL_ENTITIES) {
  const registry = parseRegistryKeys(entity.fields);
  const registrySet = new Set(registry);
  const modelColumns = extractSqlAlchemyColumns(entity.modelRel, entity.className);
  const omit = new Set(entity.omitFromRegistryRequirement ?? []);
  const virtual = new Set(entity.virtualRegistryKeys ?? []);

  const unknownOmit = [...omit].filter((c) => !modelColumns.includes(c));
  if (unknownOmit.length) {
    throw new Error(
      `[field-registry-models] ${entity.entity}: omitFromRegistryRequirement not on ${entity.className}: ${unknownOmit.join(", ")}`,
    );
  }

  const missingForModel = [];
  for (const col of modelColumns) {
    if (omit.has(col)) continue;
    const key = expectedRegistryKey(entity, col);
    if (!registrySet.has(key)) {
      missingForModel.push(col === key ? col : `${col}→${key}`);
    }
  }

  const unbackedRegistry = [];
  for (const key of registry) {
    if (virtual.has(key)) continue;
    const coversColumn = modelColumns.some(
      (col) => !omit.has(col) && expectedRegistryKey(entity, col) === key,
    );
    if (!coversColumn && modelColumns.includes(key)) {
      continue;
    }
    if (!coversColumn && !modelColumns.includes(key)) {
      unbackedRegistry.push(key);
    }
  }

  if (missingForModel.length || unbackedRegistry.length) {
    failed = true;
    console.error(`\n[field-registry-models] ${entity.entity} (${entity.className} / ${entity.fields}):`);
    if (missingForModel.length) {
      console.error(
        `  model columns missing from registry (add FieldMeta or document in omitFromRegistryRequirement): ${missingForModel.join(", ")}`,
      );
    }
    if (unbackedRegistry.length) {
      console.error(
        `  registry keys not mapped to model (add virtualRegistryKeys or fix key): ${unbackedRegistry.join(", ")}`,
      );
    }
  }
}

if (failed) {
  console.error(
    "\nField registry ↔ model check failed. Update frontend/src/constants/*Fields.ts and/or",
  );
  console.error("frontend/scripts/field-registry-model-manifest.mjs (omit/virtual/columnRegistryKey rules).");
  console.error("When the schema changes, ship model + registry + list renderers in the same change.");
  process.exit(1);
}

console.log(`Field registry ↔ model OK (${FIELD_REGISTRY_MODEL_ENTITIES.length} entities).`);
