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

function effectiveDistrictIdsForUser(user, areas, clusters, kutirs) {
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const derived = new Set();
  const clusterIds =
    user.cluster_ids.length > 0
      ? user.cluster_ids
      : kutirs && user.kutir_ids.length > 0
        ? [
            ...new Set(
              user.kutir_ids
                .map((kid) => kutirs.find((k) => k.id === kid)?.cluster_id)
                .filter((id) => id != null),
            ),
          ]
        : [];
  for (const cid of clusterIds) {
    const cluster = clusterById.get(cid);
    if (!cluster) continue;
    const districtId = areaById.get(cluster.area_id)?.district_id;
    if (districtId != null) derived.add(districtId);
  }
  const direct = user.district_ids.length > 0 ? user.district_ids : [];
  if (derived.size > 0) return [...new Set([...direct, ...derived])];
  if (direct.length > 0) return [...new Set(direct)];
  return user.district_ids;
}

function scopeDistricts(all, user, unscoped, geo) {
  if (unscoped || !user) return all;
  const ids = geo
    ? effectiveDistrictIdsForUser(user, geo.areas, geo.clusters, geo.kutirs)
    : user.district_ids;
  if (ids.length === 0) return [];
  return all.filter((d) => ids.includes(d.id));
}

const areas = [{ id: 1, district_id: 10 }];
const clusters = [{ id: 100, name: "Sironi", area_id: 1 }];
assert.deepEqual(
  effectiveDistrictIdsForUser(
    { district_ids: [], cluster_ids: [100], kutir_ids: [] },
    areas,
    clusters,
  ),
  [10],
);
assert.deepEqual(
  effectiveDistrictIdsForUser(
    { district_ids: [10], cluster_ids: [100], kutir_ids: [] },
    areas,
    clusters,
  ),
  [10],
);

// Stale user_districts vs cluster district (mukesh_jatav / Sironi → Sheopur)
const sironiAreas = [{ id: 193, district_id: 102 }];
const sironiClusters = [{ id: 373, name: "Sironi", area_id: 193 }];
const presenceDistricts = [
  { id: 102, name: "Sheopur" },
  { id: 103, name: "Shivpuri" },
];
const ccUser = {
  title: "Cluster Coordinator",
  district_ids: [103],
  cluster_ids: [373],
  kutir_ids: [],
};
assert.deepEqual(
  effectiveDistrictIdsForUser(ccUser, sironiAreas, sironiClusters),
  [103, 102],
);
// API listDistricts (geo scope) returns cluster district only, not stale user_districts
const apiScopedDistricts = [{ id: 102, name: "Sheopur" }];
const scoped = scopeDistricts(apiScopedDistricts, ccUser, false, {
  areas: sironiAreas,
  clusters: sironiClusters,
});
assert.deepEqual(
  scoped.map((d) => d.id),
  [102],
);

console.log("check-filter-auto: ok");
