from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import os, uuid, shutil

from app.database import get_db
from app.auth import get_scope, get_geo_scope, require_roles, require_kutir_in_scope, GeoScope
from app.roles import MANAGE_VISITS
from app.models.visits import KutirVisit
from app.models.kutirs import Kutir
from app.models.geo import Zone, District, Area, Cluster
from app.schemas.visits import (
    KutirVisitCreate,
    KutirVisitUpdate,
    KutirVisitOut,
    TopKutirRow,
    TopKutirsReportOut,
)
from app.config import settings

router = APIRouter()

GeoLevel = Literal["zone", "district", "cluster"]
KutirRank = Literal["top", "bottom"]


def _media(sub: str) -> str:
    path = os.path.join(settings.MEDIA_DIR, sub)
    os.makedirs(path, exist_ok=True)
    return path


# ── List ─────────────────────────────────────────────────────────────────────
@router.get("/kutir-visits", response_model=list[KutirVisitOut], tags=["Kutir Visits"])
async def list_visits(
    kutir_id: Optional[int] = Query(None),
    visited_by_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    q = select(KutirVisit)
    if scope is not None:
        q = q.where(KutirVisit.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(KutirVisit.kutir_id == kutir_id)
    if visited_by_id:
        q = q.where(KutirVisit.visited_by_id == visited_by_id)
    result = await db.execute(q.order_by(KutirVisit.visit_date.desc()))
    return result.scalars().all()


# ── Create ───────────────────────────────────────────────────────────────────
@router.post("/kutir-visits", response_model=KutirVisitOut, status_code=201, tags=["Kutir Visits"])
async def create_visit(
    data: KutirVisitCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    _=Depends(require_roles(MANAGE_VISITS)),
):
    require_kutir_in_scope(data.kutir_id, scope, detail="KutirVisit not found")
    obj = KutirVisit(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Top / Bottom 10 Kutirs by avg performance ────────────────────────────────
@router.get(
    "/kutir-visits/top-kutirs",
    response_model=TopKutirsReportOut,
    tags=["Kutir Visits"],
)
async def top_kutirs_report(
    date_from: date = Query(..., description="Inclusive visit start date"),
    date_to: date = Query(..., description="Inclusive visit end date"),
    level: GeoLevel = Query(..., description="Top-level geo pick: zone | district | cluster"),
    geo_id: int = Query(..., description="Selected zone/district/cluster id"),
    rank: KutirRank = Query("top", description="top = highest avg; bottom = lowest avg"),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    gs: GeoScope = Depends(get_geo_scope),
):
    """Top or Bottom 10 kutirs by average kutir_performance in date range under geo.

    Respects user kutir scope. Geo must be within caller's geo access.
    """
    if date_to < date_from:
        raise HTTPException(400, "date_to must be on or after date_from")

    # Resolve geo path + verify access; empty set means deny for scoped users
    if level == "zone":
        if gs.zone_ids is not None and geo_id not in gs.zone_ids:
            raise HTTPException(404, "Zone not found")
        zone = await db.get(Zone, geo_id)
        if not zone:
            raise HTTPException(404, "Zone not found")
        geo_path = [zone.name]
        show_district, show_cluster = True, True
        geo_filter = District.zone_id == geo_id
    elif level == "district":
        if gs.district_ids is not None and geo_id not in gs.district_ids:
            raise HTTPException(404, "District not found")
        district = await db.get(District, geo_id)
        if not district:
            raise HTTPException(404, "District not found")
        zone = await db.get(Zone, district.zone_id)
        geo_path = [*( [zone.name] if zone else [] ), district.name]
        show_district, show_cluster = False, True
        geo_filter = Area.district_id == geo_id
    else:  # cluster
        if gs.cluster_ids is not None and geo_id not in gs.cluster_ids:
            raise HTTPException(404, "Cluster not found")
        cluster = await db.get(Cluster, geo_id)
        if not cluster:
            raise HTTPException(404, "Cluster not found")
        area = await db.get(Area, cluster.area_id)
        district = await db.get(District, area.district_id) if area else None
        zone = await db.get(Zone, district.zone_id) if district else None
        geo_path = [
            *( [zone.name] if zone else [] ),
            *( [district.name] if district else [] ),
            cluster.name,
        ]
        show_district, show_cluster = False, False
        geo_filter = Kutir.cluster_id == geo_id

    label = "Bottom 10 Kutirs" if rank == "bottom" else "Top 10 Kutirs"
    title = f"{label} in " + " › ".join(geo_path)

    avg_perf = func.avg(KutirVisit.kutir_performance)
    visit_count = func.count(KutirVisit.id)
    # Bottom: lowest avg first; Top: highest. Tie-break by more visits.
    order = (
        (avg_perf.asc(), visit_count.desc())
        if rank == "bottom"
        else (avg_perf.desc(), visit_count.desc())
    )

    q = (
        select(
            Kutir.id.label("kutir_id"),
            Kutir.name.label("kutir_name"),
            District.name.label("district_name"),
            Cluster.name.label("cluster_name"),
            visit_count.label("num_visits"),
            avg_perf.label("avg_performance"),
        )
        .select_from(KutirVisit)
        .join(Kutir, KutirVisit.kutir_id == Kutir.id)
        .join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
        .join(District, Area.district_id == District.id)
        .where(KutirVisit.visit_date >= date_from)
        .where(KutirVisit.visit_date <= date_to)
        .where(geo_filter)
        .group_by(Kutir.id, Kutir.name, District.name, Cluster.name)
        .order_by(*order)
        .limit(10)
    )
    if scope is not None:
        if not scope:
            return TopKutirsReportOut(
                title=title,
                level=level,
                geo_id=geo_id,
                geo_path=geo_path,
                date_from=date_from,
                date_to=date_to,
                show_district=show_district,
                show_cluster=show_cluster,
                rows=[],
            )
        q = q.where(Kutir.id.in_(scope))

    result = await db.execute(q)
    rows = [
        TopKutirRow(
            kutir_id=r.kutir_id,
            kutir_name=r.kutir_name,
            district_name=r.district_name if show_district else None,
            cluster_name=r.cluster_name if show_cluster else None,
            num_visits=int(r.num_visits),
            avg_performance=round(float(r.avg_performance), 2),
        )
        for r in result.all()
    ]
    return TopKutirsReportOut(
        title=title,
        level=level,
        geo_id=geo_id,
        geo_path=geo_path,
        date_from=date_from,
        date_to=date_to,
        show_district=show_district,
        show_cluster=show_cluster,
        rows=rows,
    )


# ── Get one ──────────────────────────────────────────────────────────────────
@router.get("/kutir-visits/{id}", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def get_visit(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="KutirVisit not found")
    return obj


# ── Update ───────────────────────────────────────────────────────────────────
@router.patch("/kutir-visits/{id}", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def update_visit(
    id: int, data: KutirVisitUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    _=Depends(require_roles(MANAGE_VISITS)),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="KutirVisit not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/kutir-visits/{id}", status_code=204, tags=["Kutir Visits"])
async def delete_visit(
    id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(MANAGE_VISITS)),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="KutirVisit not found")
    await db.delete(obj)
    await db.commit()


# ── Photo upload ─────────────────────────────────────────────────────────────
@router.post("/kutir-visits/{id}/photo", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def upload_visit_photo(
    id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    _=Depends(require_roles(MANAGE_VISITS)),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="KutirVisit not found")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(_media("visit_photos"), filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    obj.visit_photo = f"visit_photos/{filename}"
    await db.commit()
    await db.refresh(obj)
    return obj
