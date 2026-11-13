"""Build geo assignment rows from M2M junction tables (scoped geo entities)."""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import GeoScope
from app.models.geo import Zone, District, Area, Cluster
from app.models.kutirs import Kutir
from app.models.users import (
    User,
    user_zones,
    user_districts,
    user_areas,
    user_clusters,
    user_kutirs,
)

LEVEL_ORDER = ("Zone", "District", "Area", "Cluster", "Kutir")

ROLE_BY_LEVEL = {
    "Zone": "Regional Head",
    "District": "District Anchor",
    "Area": "Education Coordinator",
    "Cluster": "Cluster Coordinator",
    "Kutir": "Teacher",
}


def _display_name(user: User) -> str:
    parts = [user.first_name, user.last_name]
    return " ".join(p for p in parts if p) or user.username


def _append_entity_rows(
    rows: list[dict],
    *,
    level: str,
    entity_id: int,
    entity_name: str,
    parent_chain: str,
    assignees: list[User],
) -> None:
    expected_role = ROLE_BY_LEVEL[level]
    if assignees:
        for user in assignees:
            rows.append(
                {
                    "entity_level": level,
                    "entity_id": entity_id,
                    "entity_name": entity_name,
                    "parent_chain": parent_chain,
                    "role": user.title or expected_role,
                    "user_id": user.id,
                    "user_display_name": _display_name(user),
                    "username": user.username,
                    "user_active": user.is_active,
                }
            )
    else:
        rows.append(
            {
                "entity_level": level,
                "entity_id": entity_id,
                "entity_name": entity_name,
                "parent_chain": parent_chain,
                "role": expected_role,
                "user_id": None,
                "user_display_name": None,
                "username": None,
                "user_active": None,
            }
        )


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
    kutir_scope: Optional[set[int]],
    *,
    entity_level: Optional[str] = None,
) -> list[dict]:
    """One row per assignment link; unassigned entities get a single blank-user row."""

    def level_ok(level: str) -> bool:
        return entity_level is None or entity_level == level

    rows: list[dict] = []

    # ── Load geo entities (scoped) ─────────────────────────────────────────────
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

    aq = select(Area).order_by(Area.name)
    if gs.area_ids is not None:
        aq = aq.where(Area.id.in_(gs.area_ids))
    areas = (await db.execute(aq)).scalars().all()
    area_by_id = {a.id: a for a in areas}

    cq = select(Cluster).order_by(Cluster.name)
    if gs.cluster_ids is not None:
        cq = cq.where(Cluster.id.in_(gs.cluster_ids))
    clusters = (await db.execute(cq)).scalars().all()
    cluster_by_id = {c.id: c for c in clusters}

    kq = select(Kutir).order_by(Kutir.name)
    if kutir_scope is not None:
        if not kutir_scope:
            kutirs: list[Kutir] = []
        else:
            kq = kq.where(Kutir.id.in_(kutir_scope))
            kutirs = (await db.execute(kq)).scalars().all()
    else:
        kutirs = (await db.execute(kq)).scalars().all()

    zone_ids = {z.id for z in zones}
    district_ids = {d.id for d in districts}
    area_ids = {a.id for a in areas}
    cluster_ids = {c.id for c in clusters}
    kutir_ids = {k.id for k in kutirs}

    zone_users = await _users_by_entity(db, user_zones, user_zones.c.zone_id, zone_ids)
    district_users = await _users_by_entity(
        db, user_districts, user_districts.c.district_id, district_ids
    )
    area_users = await _users_by_entity(db, user_areas, user_areas.c.area_id, area_ids)
    cluster_users = await _users_by_entity(
        db, user_clusters, user_clusters.c.cluster_id, cluster_ids
    )
    kutir_users = await _users_by_entity(db, user_kutirs, user_kutirs.c.kutir_id, kutir_ids)

    if level_ok("Zone"):
        for z in zones:
            _append_entity_rows(
                rows,
                level="Zone",
                entity_id=z.id,
                entity_name=z.name,
                parent_chain="",
                assignees=zone_users.get(z.id, []),
            )

    if level_ok("District"):
        for d in districts:
            zname = zone_by_id.get(d.zone_id).name if d.zone_id in zone_by_id else ""
            parent = f"Zone: {zname}" if zname else ""
            _append_entity_rows(
                rows,
                level="District",
                entity_id=d.id,
                entity_name=d.name,
                parent_chain=parent,
                assignees=district_users.get(d.id, []),
            )

    if level_ok("Area"):
        for a in areas:
            d = district_by_id.get(a.district_id)
            parts = []
            if d:
                parts.append(f"District: {d.name}")
                z = zone_by_id.get(d.zone_id)
                if z:
                    parts.append(f"Zone: {z.name}")
            _append_entity_rows(
                rows,
                level="Area",
                entity_id=a.id,
                entity_name=a.name,
                parent_chain=" · ".join(parts),
                assignees=area_users.get(a.id, []),
            )

    if level_ok("Cluster"):
        for c in clusters:
            a = area_by_id.get(c.area_id)
            parts = []
            if a:
                parts.append(f"Area: {a.name}")
                d = district_by_id.get(a.district_id)
                if d:
                    parts.append(f"District: {d.name}")
                    z = zone_by_id.get(d.zone_id)
                    if z:
                        parts.append(f"Zone: {z.name}")
            _append_entity_rows(
                rows,
                level="Cluster",
                entity_id=c.id,
                entity_name=c.name,
                parent_chain=" · ".join(parts),
                assignees=cluster_users.get(c.id, []),
            )

    if level_ok("Kutir"):
        for k in kutirs:
            cl = cluster_by_id.get(k.cluster_id)
            parts = []
            if cl:
                parts.append(f"Cluster: {cl.name}")
                a = area_by_id.get(cl.area_id)
                if a:
                    parts.append(f"Area: {a.name}")
                    d = district_by_id.get(a.district_id)
                    if d:
                        parts.append(f"District: {d.name}")
            _append_entity_rows(
                rows,
                level="Kutir",
                entity_id=k.id,
                entity_name=k.name,
                parent_chain=" · ".join(parts),
                assignees=kutir_users.get(k.id, []),
            )

    return rows
