from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta=None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.users import User

    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.title != "Admin" and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_any_role(user=Depends(get_current_user)):
    return user


def require_roles(allowed: list[str]):
    async def _guard(user=Depends(get_current_user)):
        if user.title not in allowed and user.title != "Admin" and not user.is_superuser:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _guard


# ── Geo-scoped access ─────────────────────────────────────────────────────────
#
# Assignment storage per role:
#   Regional Head            → zones.zonal_head_id          (scalar FK on Zone)
#   District Anchor       → districts.district_anchor_id  (scalar FK on District)
#   Education Coordinator → areas.education_coordinator_id (scalar FK on Area)
#   Cluster Coordinator   → clusters.cluster_coordinator_id (scalar FK on Cluster)
#   Teacher               → user_kutirs M2M              (managed by _sync_teachers)
#
# We query geo tables directly instead of user_* M2M tables (those are unused).


async def _get_assigned_ids(title: str, user_id: int, db: AsyncSession):
    """
    Return (zone_ids, district_ids, area_ids, cluster_ids, kutir_ids) as sets
    for a non-admin user, by querying the scalar FK columns on each geo table.
    """
    from app.models.geo import Zone, District, Area, Cluster
    from app.models.users import user_kutirs

    z_ids: set[int] = set()
    d_ids: set[int] = set()
    a_ids: set[int] = set()
    c_ids: set[int] = set()
    k_ids: set[int] = set()

    if title == "Regional Head":
        rows = await db.execute(select(Zone.id).where(Zone.zonal_head_id == user_id))
        z_ids = {r[0] for r in rows.all()}

    elif title == "District Anchor":
        rows = await db.execute(select(District.id).where(District.district_anchor_id == user_id))
        d_ids = {r[0] for r in rows.all()}

    elif title == "Education Coordinator":
        rows = await db.execute(select(Area.id).where(Area.education_coordinator_id == user_id))
        a_ids = {r[0] for r in rows.all()}

    elif title == "Cluster Coordinator":
        rows = await db.execute(select(Cluster.id).where(Cluster.cluster_coordinator_id == user_id))
        c_ids = {r[0] for r in rows.all()}

    elif title == "Teacher":
        rows = await db.execute(
            select(user_kutirs.c.kutir_id).where(user_kutirs.c.user_id == user_id)
        )
        k_ids = {r[0] for r in rows.all()}

    return z_ids, d_ids, a_ids, c_ids, k_ids


async def get_user_kutir_scope(user, db: AsyncSession) -> Optional[set[int]]:
    """
    Return the set of kutir_ids the user may access, or None for unrestricted (Admin).
    """
    if user.is_admin:
        return None

    from app.models.geo import Cluster, District, Area
    from app.models.kutirs import Kutir

    title = user.title
    z_ids, d_ids, a_ids, c_ids, k_ids = await _get_assigned_ids(title, user.id, db)

    if title == "Teacher":
        return k_ids

    if title == "Cluster Coordinator":
        if not c_ids:
            return set()
        rows = await db.execute(select(Kutir.id).where(Kutir.cluster_id.in_(c_ids)))
        return {r[0] for r in rows.all()}

    if title == "Education Coordinator":
        if not a_ids:
            return set()
        cl = await db.execute(select(Cluster.id).where(Cluster.area_id.in_(a_ids)))
        c_ids = {r[0] for r in cl.all()}
        if not c_ids:
            return set()
        rows = await db.execute(select(Kutir.id).where(Kutir.cluster_id.in_(c_ids)))
        return {r[0] for r in rows.all()}

    if title == "District Anchor":
        if not d_ids:
            return set()
        rows = await db.execute(select(Kutir.id).where(Kutir.district_id.in_(d_ids)))
        return {r[0] for r in rows.all()}

    if title == "Regional Head":
        if not z_ids:
            return set()
        dist = await db.execute(select(District.id).where(District.zone_id.in_(z_ids)))
        d_ids = {r[0] for r in dist.all()}
        if not d_ids:
            return set()
        rows = await db.execute(select(Kutir.id).where(Kutir.district_id.in_(d_ids)))
        return {r[0] for r in rows.all()}

    return set()  # unknown title


async def get_scope(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Optional[set[int]]:
    return await get_user_kutir_scope(user, db)


# ── Geo hierarchy scope ───────────────────────────────────────────────────────

@dataclass
class GeoScope:
    cluster_ids:  Optional[set[int]] = None
    area_ids:     Optional[set[int]] = None
    district_ids: Optional[set[int]] = None
    zone_ids:     Optional[set[int]] = None


async def get_user_geo_scope(user, db: AsyncSession) -> GeoScope:
    if user.is_admin:
        return GeoScope()  # all None = unrestricted

    from app.models.geo import Cluster, Area, District
    from app.models.kutirs import Kutir

    title = user.title
    EMPTY = GeoScope(cluster_ids=set(), area_ids=set(), district_ids=set(), zone_ids=set())

    z_ids, d_ids, a_ids, c_ids, k_ids = await _get_assigned_ids(title, user.id, db)

    async def _clusters_to_scope(cluster_ids: set[int]) -> GeoScope:
        if not cluster_ids:
            return EMPTY
        ar = await db.execute(select(Cluster.area_id).where(Cluster.id.in_(cluster_ids)).distinct())
        area_ids = {r[0] for r in ar.all() if r[0] is not None}
        di = await db.execute(select(Area.district_id).where(Area.id.in_(area_ids)).distinct())
        district_ids = {r[0] for r in di.all() if r[0] is not None}
        zo = await db.execute(select(District.zone_id).where(District.id.in_(district_ids)).distinct())
        zone_ids = {r[0] for r in zo.all() if r[0] is not None}
        return GeoScope(cluster_ids=cluster_ids, area_ids=area_ids, district_ids=district_ids, zone_ids=zone_ids)

    if title == "Teacher":
        if not k_ids:
            return EMPTY
        rows = await db.execute(select(Kutir.cluster_id).where(Kutir.id.in_(k_ids)).distinct())
        c_ids = {r[0] for r in rows.all() if r[0] is not None}
        return await _clusters_to_scope(c_ids)

    if title == "Cluster Coordinator":
        return await _clusters_to_scope(c_ids)

    if title == "Education Coordinator":
        if not a_ids:
            return EMPTY
        cl = await db.execute(select(Cluster.id).where(Cluster.area_id.in_(a_ids)))
        c_ids = {r[0] for r in cl.all()}
        di = await db.execute(select(Area.district_id).where(Area.id.in_(a_ids)).distinct())
        district_ids = {r[0] for r in di.all() if r[0] is not None}
        zo = await db.execute(select(District.zone_id).where(District.id.in_(district_ids)).distinct())
        zone_ids = {r[0] for r in zo.all() if r[0] is not None}
        return GeoScope(cluster_ids=c_ids, area_ids=a_ids, district_ids=district_ids, zone_ids=zone_ids)

    if title == "District Anchor":
        if not d_ids:
            return EMPTY
        ar = await db.execute(select(Area.id).where(Area.district_id.in_(d_ids)))
        a_ids = {r[0] for r in ar.all()}
        cl = await db.execute(select(Cluster.id).where(Cluster.area_id.in_(a_ids)))
        c_ids = {r[0] for r in cl.all()}
        zo = await db.execute(select(District.zone_id).where(District.id.in_(d_ids)).distinct())
        zone_ids = {r[0] for r in zo.all() if r[0] is not None}
        return GeoScope(cluster_ids=c_ids, area_ids=a_ids, district_ids=d_ids, zone_ids=zone_ids)

    if title == "Regional Head":
        if not z_ids:
            return EMPTY
        di = await db.execute(select(District.id).where(District.zone_id.in_(z_ids)))
        d_ids = {r[0] for r in di.all()}
        ar = await db.execute(select(Area.id).where(Area.district_id.in_(d_ids)))
        a_ids = {r[0] for r in ar.all()}
        cl = await db.execute(select(Cluster.id).where(Cluster.area_id.in_(a_ids)))
        c_ids = {r[0] for r in cl.all()}
        return GeoScope(cluster_ids=c_ids, area_ids=a_ids, district_ids=d_ids, zone_ids=z_ids)

    return EMPTY


async def get_geo_scope(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeoScope:
    return await get_user_geo_scope(user, db)
