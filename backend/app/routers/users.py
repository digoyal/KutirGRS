from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin, hash_password
from app.models.users import User, user_zones, user_districts, user_areas, user_clusters, user_kutirs
from app.schemas.users import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/users", tags=["Users"])

# ── M2M sync helpers ──────────────────────────────────────────────────────────

async def _sync_zones(db: AsyncSession, user_id: int, ids: list[int]) -> None:
    await db.execute(delete(user_zones).where(user_zones.c.user_id == user_id))
    for i in ids:
        await db.execute(insert(user_zones).values(user_id=user_id, zone_id=i))

async def _sync_districts(db: AsyncSession, user_id: int, ids: list[int]) -> None:
    await db.execute(delete(user_districts).where(user_districts.c.user_id == user_id))
    for i in ids:
        await db.execute(insert(user_districts).values(user_id=user_id, district_id=i))

async def _sync_areas(db: AsyncSession, user_id: int, ids: list[int]) -> None:
    await db.execute(delete(user_areas).where(user_areas.c.user_id == user_id))
    for i in ids:
        await db.execute(insert(user_areas).values(user_id=user_id, area_id=i))

async def _sync_clusters(db: AsyncSession, user_id: int, ids: list[int]) -> None:
    await db.execute(delete(user_clusters).where(user_clusters.c.user_id == user_id))
    for i in ids:
        await db.execute(insert(user_clusters).values(user_id=user_id, cluster_id=i))

async def _sync_kutirs(db: AsyncSession, user_id: int, ids: list[int]) -> None:
    await db.execute(delete(user_kutirs).where(user_kutirs.c.user_id == user_id))
    for i in ids:
        await db.execute(insert(user_kutirs).values(user_id=user_id, kutir_id=i))


# ── M2M read helpers ──────────────────────────────────────────────────────────

async def _get_zone_ids(db: AsyncSession, user_id: int) -> list[int]:
    r = await db.execute(select(user_zones.c.zone_id).where(user_zones.c.user_id == user_id))
    return [row[0] for row in r.all()]

async def _get_district_ids(db: AsyncSession, user_id: int) -> list[int]:
    r = await db.execute(select(user_districts.c.district_id).where(user_districts.c.user_id == user_id))
    return [row[0] for row in r.all()]

async def _get_area_ids(db: AsyncSession, user_id: int) -> list[int]:
    r = await db.execute(select(user_areas.c.area_id).where(user_areas.c.user_id == user_id))
    return [row[0] for row in r.all()]

async def _get_cluster_ids(db: AsyncSession, user_id: int) -> list[int]:
    r = await db.execute(select(user_clusters.c.cluster_id).where(user_clusters.c.user_id == user_id))
    return [row[0] for row in r.all()]

async def _get_kutir_ids(db: AsyncSession, user_id: int) -> list[int]:
    r = await db.execute(select(user_kutirs.c.kutir_id).where(user_kutirs.c.user_id == user_id))
    return [row[0] for row in r.all()]


async def _attach_geo(db: AsyncSession, user: User) -> dict:
    """Build a UserOut dict with all M2M geo arrays attached."""
    d = UserOut.model_validate(user).model_dump()
    d["zone_ids"]     = await _get_zone_ids(db, user.id)
    d["district_ids"] = await _get_district_ids(db, user.id)
    d["area_ids"]     = await _get_area_ids(db, user.id)
    d["cluster_ids"]  = await _get_cluster_ids(db, user.id)
    d["kutir_ids"]    = await _get_kutir_ids(db, user.id)
    return d


# ── Role → which M2M tables are active ───────────────────────────────────────

ROLE_ACTIVE = {
    "Admin":                 set(),
    "Regional Head":         {"zones"},
    "District Anchor":       {"districts"},
    "Education Coordinator": {"areas"},
    "Cluster Coordinator":   {"clusters"},
    "Teacher":               {"kutirs"},
}


async def _sync_for_role(db: AsyncSession, user_id: int, title: Optional[str], body_data: dict) -> None:
    """Sync only the M2M tables relevant to this role; clear the rest."""
    active = ROLE_ACTIVE.get(title or "", set())

    await _sync_zones(db, user_id, body_data.get("zone_ids", []) if "zones" in active else [])
    await _sync_districts(db, user_id, body_data.get("district_ids", []) if "districts" in active else [])
    await _sync_areas(db, user_id, body_data.get("area_ids", []) if "areas" in active else [])
    await _sync_clusters(db, user_id, body_data.get("cluster_ids", []) if "clusters" in active else [])
    await _sync_kutirs(db, user_id, body_data.get("kutir_ids", []) if "kutirs" in active else [])


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[UserOut])
async def list_users(
    is_active: Optional[bool] = Query(None),
    title: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    q = select(User).order_by(User.username)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if title:
        q = q.where(User.title == title)
    result = await db.execute(q)
    users = result.scalars().all()
    return [await _attach_geo(db, u) for u in users]


@router.post("", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"Username '{body.username}' already taken")

    geo_keys = {"zone_ids", "district_ids", "area_ids", "cluster_ids", "kutir_ids"}
    data = body.model_dump(exclude=geo_keys)
    data["password"] = hash_password(data["password"])

    obj = User(**data)
    db.add(obj)
    await db.flush()

    body_data = body.model_dump()
    await _sync_for_role(db, obj.id, obj.title, body_data)

    await db.commit()
    await db.refresh(obj)
    return await _attach_geo(db, obj)


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _attach_geo(db, current_user)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")
    return await _attach_geo(db, obj)


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")

    geo_keys = {"zone_ids", "district_ids", "area_ids", "cluster_ids", "kutir_ids"}
    data = body.model_dump(exclude_unset=True, exclude=geo_keys)
    if "password" in data:
        if data["password"]:
            data["password"] = hash_password(data["password"])
        else:
            del data["password"]

    for k, v in data.items():
        setattr(obj, k, v)

    # Sync M2M based on (possibly new) role
    new_title = data.get("title", obj.title)
    body_data = body.model_dump(exclude_unset=False)  # include defaults for unset geo arrays
    # For update: if caller didn't send a geo array, preserve existing
    active = ROLE_ACTIVE.get(new_title or "", set())
    if "zones" in active:
        ids = body.zone_ids if body.zone_ids is not None else await _get_zone_ids(db, user_id)
        await _sync_zones(db, user_id, ids)
    else:
        await _sync_zones(db, user_id, [])

    if "districts" in active:
        ids = body.district_ids if body.district_ids is not None else await _get_district_ids(db, user_id)
        await _sync_districts(db, user_id, ids)
    else:
        await _sync_districts(db, user_id, [])

    if "areas" in active:
        ids = body.area_ids if body.area_ids is not None else await _get_area_ids(db, user_id)
        await _sync_areas(db, user_id, ids)
    else:
        await _sync_areas(db, user_id, [])

    if "clusters" in active:
        ids = body.cluster_ids if body.cluster_ids is not None else await _get_cluster_ids(db, user_id)
        await _sync_clusters(db, user_id, ids)
    else:
        await _sync_clusters(db, user_id, [])

    if "kutirs" in active:
        ids = body.kutir_ids if body.kutir_ids is not None else await _get_kutir_ids(db, user_id)
        await _sync_kutirs(db, user_id, ids)
    else:
        await _sync_kutirs(db, user_id, [])

    await db.commit()
    await db.refresh(obj)
    return await _attach_geo(db, obj)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(require_admin)):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")
    await db.delete(obj)
    await db.commit()
