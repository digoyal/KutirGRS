from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import (
    get_scope,
    get_geo_scope,
    GeoScope,
    require_roles,
    require_kutir_in_scope,
    require_cluster_in_geo_scope,
)
from app.roles import MANAGE_KUTIRS
from app.geo_delete import delete_kutir_if_allowed
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area, District, Zone
from app.models.users import User, user_kutirs
from app.kutir_geocode import ADDRESS_FIELDS, try_geocode_kutir
from app.schemas.kutirs import KutirCreate, KutirUpdate, KutirOut, KutirDetail, TeacherMin

router = APIRouter(prefix="/kutirs", tags=["Kutirs"])


async def _sync_kutir_district_from_cluster(db: AsyncSession, kutir: Kutir) -> None:
    """Backfill denormalized district_id from cluster→area when missing."""
    if kutir.district_id is not None or not kutir.cluster_id:
        return
    row = await db.execute(
        select(Area.district_id)
        .join(Cluster, Cluster.area_id == Area.id)
        .where(Cluster.id == kutir.cluster_id)
    )
    district_id = row.scalar_one_or_none()
    if district_id is not None:
        kutir.district_id = district_id


async def _teachers_by_kutir_ids(
    db: AsyncSession, kutir_ids: list[int]
) -> dict[int, list[TeacherMin]]:
    if not kutir_ids:
        return {}
    t_result = await db.execute(
        select(User, user_kutirs.c.kutir_id)
        .join(user_kutirs, User.id == user_kutirs.c.user_id)
        .where(user_kutirs.c.kutir_id.in_(kutir_ids))
        .order_by(user_kutirs.c.kutir_id, User.first_name, User.last_name)
    )
    out: dict[int, list[TeacherMin]] = {}
    for user, kutir_id in t_result.all():
        out.setdefault(kutir_id, []).append(TeacherMin.model_validate(user))
    return out


async def _get_kutir_detail(db: AsyncSession, kutir_id: int) -> KutirDetail:
    """Fetch a kutir with geo chain and teachers list."""
    q = (
        select(Kutir)
        .where(Kutir.id == kutir_id)
        .options(
            selectinload(Kutir.cluster).selectinload(Cluster.area)
            .selectinload(Area.district).selectinload(District.zone),
        )
    )
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Kutir not found")

    teachers_map = await _teachers_by_kutir_ids(db, [kutir_id])
    detail = KutirDetail.model_validate(obj)
    detail.teachers = teachers_map.get(kutir_id, [])
    return detail


@router.get("", response_model=list[KutirOut])
async def list_kutirs(
    response: Response,
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
    kutir_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    needs_geo_join = not cluster_id and (
        district_id is not None or zone_id is not None
    )

    def _apply_filters(q):
        if needs_geo_join:
            q = (
                q.join(Cluster, Kutir.cluster_id == Cluster.id)
                .join(Area, Cluster.area_id == Area.id)
            )
        if scope is not None:
            q = q.where(Kutir.id.in_(scope))
        if cluster_id:
            q = q.where(Kutir.cluster_id == cluster_id)
        elif district_id:
            q = q.where(
                or_(Kutir.district_id == district_id, Area.district_id == district_id)
            )
        elif zone_id:
            zone_districts = select(District.id).where(District.zone_id == zone_id)
            q = q.where(
                or_(
                    Kutir.district_id.in_(zone_districts),
                    Area.district_id.in_(zone_districts),
                )
            )
        if kutir_type:
            q = q.where(Kutir.kutir_type == kutir_type)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.where(
                (Kutir.name.ilike(term))
                | (Kutir.street.ilike(term))
                | (Kutir.pincode.ilike(term))
            )
        return q

    count_q = _apply_filters(select(func.count()).select_from(Kutir))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(select(Kutir)).order_by(Kutir.name)
    if limit is not None:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    objs = result.scalars().all()
    teachers_map = await _teachers_by_kutir_ids(db, [o.id for o in objs])
    return [
        KutirOut.model_validate(o).model_copy(
            update={"teachers": teachers_map.get(o.id, [])}
        )
        for o in objs
    ]


@router.post("", response_model=KutirDetail, status_code=201)
async def create_kutir(
    body: KutirCreate,
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(require_roles(MANAGE_KUTIRS)),
):
    # New kutir has no id yet — authorize via destination cluster in geo scope.
    require_cluster_in_geo_scope(body.cluster_id, gs, detail="Kutir not found")
    data = body.model_dump()
    has_manual_coords = data.get("latitude") is not None and data.get("longitude") is not None
    if has_manual_coords:
        if not data.get("location_source"):
            data["location_source"] = "manual"
    obj = Kutir(**data)
    db.add(obj)
    await db.flush()
    await _sync_kutir_district_from_cluster(db, obj)
    geocode_message: str | None = None
    if not has_manual_coords:
        geocode_message = await try_geocode_kutir(db, obj)
    await db.commit()
    detail = await _get_kutir_detail(db, obj.id)
    detail.geocode_message = geocode_message
    return detail


@router.get("/{kutir_id}", response_model=KutirDetail)
async def get_kutir(
    kutir_id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    require_kutir_in_scope(kutir_id, scope, detail="Kutir not found")
    return await _get_kutir_detail(db, kutir_id)


@router.put("/{kutir_id}", response_model=KutirDetail)
async def update_kutir(
    kutir_id: int,
    body: KutirUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(require_roles(MANAGE_KUTIRS)),
):
    require_kutir_in_scope(kutir_id, scope, detail="Kutir not found")
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    data = body.model_dump(exclude_unset=True)
    if "cluster_id" in data:
        require_cluster_in_geo_scope(data["cluster_id"], gs, detail="Kutir not found")
    address_changed = bool(ADDRESS_FIELDS.intersection(data.keys()))
    for k, v in data.items():
        setattr(obj, k, v)
    if "cluster_id" in data or obj.district_id is None:
        await _sync_kutir_district_from_cluster(db, obj)
    manual_coords_update = "latitude" in data or "longitude" in data
    if manual_coords_update:
        if obj.latitude is not None and obj.longitude is not None:
            if "location_source" not in data or data.get("location_source") is None:
                obj.location_source = "manual"
        else:
            obj.location_source = None
            obj.geocoded_at = None
    geocode_message: str | None = None
    if address_changed and not manual_coords_update and obj.location_source != "manual":
        geocode_message = await try_geocode_kutir(db, obj)
    await db.commit()
    detail = await _get_kutir_detail(db, kutir_id)
    detail.geocode_message = geocode_message
    return detail


@router.delete("/{kutir_id}", status_code=204)
async def delete_kutir(
    kutir_id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    _=Depends(require_roles(MANAGE_KUTIRS)),
):
    require_kutir_in_scope(kutir_id, scope, detail="Kutir not found")
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    await delete_kutir_if_allowed(db, obj)
