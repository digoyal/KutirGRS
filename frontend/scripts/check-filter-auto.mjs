/**
 * Smoke check for autoPickFilterId (no test runner in frontend).
 */
import assert from "node:assert/strict";

// Mirrors autoPickFilterId in geoFilters.ts
function optionIdsInclude(options, id) {
  return id !== "" && options.some((o) => o.id === id);
}

function autoPickFilterId(options, current, enabled, opts = {}) {
  const hasAll = opts.hasAll !== false;
  const skip = opts.skip === true;
  const cascade = opts.cascade === true;
  if (!enabled || skip) return null;

  if (options.length === 0) {
    if (hasAll && current !== "") return "";
    return null;
  }

  if (options.length === 1) {
    const only = options[0].id;
    if (current === only) return null;
    if (current === "" || !optionIdsInclude(options, current)) return only;
    return null;
  }

  if (!hasAll) return null;
  if (current === "") return null;
  if (cascade || !optionIdsInclude(options, current)) return "";
  return null;
}

// singleton
assert.equal(autoPickFilterId([], "", true), null);
assert.equal(autoPickFilterId([{ id: 1, name: "A" }], "", true), 1);
assert.equal(autoPickFilterId([{ id: 1, name: "A" }], 2, true), 1);
assert.equal(autoPickFilterId([{ id: 1, name: "A" }, { id: 2, name: "B" }], "", true), null);
assert.equal(autoPickFilterId([{ id: 1, name: "A" }], "", false), null);

// multi + All, cascade → All
assert.equal(
  autoPickFilterId(
    [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ],
    1,
    true,
    { cascade: true },
  ),
  "",
);

// multi + valid pick, no cascade → unchanged
assert.equal(
  autoPickFilterId(
    [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ],
    1,
    true,
    { cascade: false },
  ),
  null,
);

// stale child → single pick
assert.equal(autoPickFilterId([{ id: 3, name: "C" }], 9, true, { cascade: true }), 3);

// skip
assert.equal(autoPickFilterId([{ id: 1, name: "A" }], "", true, { skip: true }), null);

// picker (hasAll: false): no multi→All; empty list does not clear a pick
assert.equal(
  autoPickFilterId(
    [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ],
    1,
    true,
    { hasAll: false, cascade: true },
  ),
  null,
);
assert.equal(autoPickFilterId([], 1, true, { hasAll: false }), null);

console.log("check-filter-auto: ok");
