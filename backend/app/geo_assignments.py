"""Build geo assignment rows from M2M junction tables (scoped geo entities)."""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import GeoScope
from app.models.geo import Zone, District, Area, Cluster, State
from app.models.users import (
    User,
    user_zones,
    user_districts,
    user_areas,
    user_clusters,
)

VIEW_LEVELS = ("Zone", "District", "Area", "Cluster")


def _display_name(user: User) -> str:
    parts = [user.first_name, user.last_name]
    return " ".join(p for p in parts if p) or user.username


def _head_names(users: list[User]) -> str:
    if not users:
        return ""
    return ", ".join(_display_name(u) for u in users)


async def _users_by_entity(
    db: AsyncSession,
    junction,
    entity_col,
    entity_ids: set[int],
) -> dict[int, list[User]]:
    if not entity_ids:
        return {}
    q = (
        select(entity_col, User)
        .select_from(junction.join(User, User.id == junction.c.user_id))
        .where(entity_col.in_(entity_ids))
        .order_by(entity_col, User.first_name, User.last_name, User.username)
    )
    result = await db.execute(q)
    grouped: dict[int, list[User]] = defaultdict(list)
    for eid, user in result.all():
        grouped[eid].append(user)
    return grouped


async def list_geo_assignment_rows(
    db: AsyncSession,
    gs: GeoScope,
    *,
    entity_level: str,
    zone_id: Optional[int] = None,
    district_id: Optional[int] = None,
    area_id: Optional[int] = None,
    cluster_id: Optional[int] = None,
) -> list[dict]:
    """One row per entity at the chosen level with parent + head columns.

    Cluster rows include the full zone → district → area → cluster chain (8 name/head
    columns on the client). Area rows include zone → district → area (6 columns).
    Zone rows use State (via districts) as parent; no parent head column on the client (3 columns).
    District rows use the immediate parent only (4 columns).
    """

    rows: list[dict] = []

    zq = select(Zone).order_by(Zone.name)
    if gs.zone_ids is not None:
        zq = zq.where(Zone.id.in_(gs.zone_ids))
    zones = (await db.execute(zq)).scalars().all()
    zone_by_id = {z.id: z for z in zones}

    dq = select(District).order_by(District.name)
    if gs.district_ids is not None:
        dq = dq.where(District.id.in_(gs.district_ids))
    districts = (await db.execute(dq)).scalars().all()
    district_by_id = {d.id: d for d in districts}

    state_by_id = {
        s.id: s.name
        for s in (await db.execute(select(State))).scalars().all()
    }
    zone_state_names: dict[int, list[str]] = defaultdict(list)
    seen: dict[int, set[str]] = defaultdict(set)
    for d in districts:
        sname = state_by_id.get(d.state_id)
        if sname and sname not in seen[d.zone_id]:
            seen[d.zone_id].add(sname)
            zone_state_names[d.zone_id].append(sname)
    for zid in zone_state_names:
        zone_state_names[zid].sort()

    aq = select(Area).order_by(Area.name)
    if gs.area_ids is not None:
        aq = aq.where(Area.id.in_(gs.area_ids))
    areas = (await db.execute(aq)).scalars().all()
    area_by_id = {a.id: a for a in areas}

    cq = select(Cluster).order_by(Cluster.name)
    if gs.cluster_ids is not None:
        cq = cq.where(Cluster.id.in_(gs.cluster_ids))
    clusters = (await db.execute(cq)).scalars().all()

    zone_ids = {z.id for z in zones}
    district_ids = {d.id for d in districts}
    area_ids = {a.id for a in areas}
    cluster_ids = {c.id for c in clusters}

    zone_users = await _users_by_entity(db, user_zones, user_zones.c.zone_id, zone_ids)
    district_users = await _users_by_entity(
        db, user_districts, user_districts.c.district_id, district_ids
    )
    area_users = await _users_by_entity(db, user_areas, user_areas.c.area_id, area_ids)
    cluster_users = await _users_by_entity(
        db, user_clusters, user_clusters.c.cluster_id, cluster_ids
    )

    if entity_level == "Zone":
        for z in zones:
            if zone_id is not None and z.id != zone_id:
                continue
            state_label = ", ".join(zone_state_names.get(z.id, []))
            rows.append(
                {
                    "entity_level": "Zone",
                    "entity_id": z.id,
                    "parent_entity_name": state_label,
                    "parent_entity_head": "",
                    "entity_name": z.name,
                    "entity_head": _head_names(zone_users.get(z.id, [])),
                    "zone_name": "",
                    "zone_head": "",
                    "district_name": "",
                    "district_head": "",
                    "area_name": "",
                    "area_head": "",
                }
            )

    elif entity_level == "District":
        for d in districts:
            if zone_id is not None and d.zone_id != zone_id:
                continue
            if district_id is not None and d.id != district_id:
                continue
            z = zone_by_id.get(d.zone_id)
            rows.append(
                {
                    "entity_level": "District",
                    "entity_id": d.id,
                    "parent_entity_name": z.name if z else "",
                    "parent_entity_head": _head_names(zone_users.get(d.zone_id, []))
                    if d.zone_id
                    else "",
                    "entity_name": d.name,
                    "entity_head": _head_names(district_users.get(d.id, [])),
                    "zone_name": "",
                    "zone_head": "",
                    "district_name": "",
                    "district_head": "",
                    "area_name": "",
                    "area_head": "",
                }
            )

    elif entity_level == "Area":
        for a in areas:
            d = district_by_id.get(a.district_id)
            if zone_id is not None and (d is None or d.zone_id != zone_id):
                continue
            if district_id is not None and a.district_id != district_id:
                continue
            if area_id is not None and a.id != area_id:
                continue
            z = zone_by_id.get(d.zone_id) if d else None
            zid = d.zone_id if d else None
            rows.append(
                {
                    "entity_level": "Area",
                    "entity_id": a.id,
                    "parent_entity_name": d.name if d else "",
                    "parent_entity_head": _head_names(district_users.get(d.id, []))
                    if d
                    else "",
                    "entity_name": a.name,
                    "entity_head": _head_names(area_users.get(a.id, [])),
                    "zone_name": z.name if z else "",
                    "zone_head": _head_names(zone_users.get(zid, [])) if zid else "",
                    "district_name": d.name if d else "",
                    "district_head": _head_names(district_users.get(d.id, []))
                    if d
                    else "",
                    "area_name": a.name,
                    "area_head": _head_names(area_users.get(a.id, [])),
                }
            )

    elif entity_level == "Cluster":
        for c in clusters:
            a = area_by_id.get(c.area_id)
            if a is None:
                continue
            d = district_by_id.get(a.district_id)
            if zone_id is not None and (d is None or d.zone_id != zone_id):
                continue
            if district_id is not None and a.district_id != district_id:
                continue
            if area_id is not None and a.id != area_id:
                continue
            if cluster_id is not None and c.id != cluster_id:
                continue
            z = zone_by_id.get(d.zone_id) if d else None
            zid = d.zone_id if d else None
            rows.append(
                {
                    "entity_level": "Cluster",
                    "entity_id": c.id,
                    "parent_entity_name": a.name,
                    "parent_entity_head": _head_names(area_users.get(a.id, [])),
                    "entity_name": c.name,
                    "entity_head": _head_names(cluster_users.get(c.id, [])),
                    "zone_name": z.name if z else "",
                    "zone_head": _head_names(zone_users.get(zid, [])) if zid else "",
                    "district_name": d.name if d else "",
                    "district_head": _head_names(district_users.get(d.id, []))
                    if d
                    else "",
                    "area_name": a.name,
                    "area_head": _head_names(area_users.get(a.id, [])),
                }
            )

    return rows