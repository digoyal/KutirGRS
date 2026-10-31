from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import os, uuid, shutil

from app.database import get_db
from app.auth import (
    get_current_user,
    get_scope,
    get_geo_scope,
    require_roles,
    require_kutir_in_scope,
    GeoScope,
)
from app.roles import MANAGE_VISITS
from app.models.visits import KutirVisit
from app.models.kutirs import Kutir
from app.models.geo import Zone, District, Area, Cluster, State
from app.models.users import User
from app.schemas.visits import (
    KutirVisitCreate,
    KutirVisitUpdate,
    KutirVisitOut,
    TopKutirRow,
    TopKutirsReportOut,
    KutirPerformanceRow,
    KutirPerformanceReportOut,
    VisitDetailedRow,
    VisitDetailedReportOut,
)
from app.config import settings

router = APIRouter()

GeoLevel = Literal["zone", "district", "cluster"]
KutirRank = Literal["top", "bottom"]
KutirPerformanceMetric = Literal[
    "kutir_performance",
    "cleanliness",
    "hindi_proficiency",
    "english_proficiency",
    "maths_proficiency",
    "evs_proficiency",
    "reasoning_proficiency",
    "material_management",
    "staff_behavior",
]

# Keep in sync with formLabel (or label) in frontend visitsFields.ts for rating keys.
KUTIR_PERFORMANCE_METRIC_LABELS: dict[str, str] = {
    "kutir_performance": "Kutir Performance",
    "cleanliness": "Cleanliness",
    "hindi_proficiency": "Hindi Proficiency",
    "english_proficiency": "English Proficiency",
    "maths_proficiency": "Math Proficiency",
    "evs_proficiency": "EVS Proficiency (class 5 only)",
    "reasoning_proficiency": "Reasoning Proficiency (class 5 only)",
    "material_management": "Material Management",
    "staff_behavior": "Kutir Staff Behavior",
}


def _media(sub: str) -> str:
    path = os.path.join(settings.MEDIA_DIR, sub)
    os.makedirs(path, exist_ok=True)
    return path


# ── List ─────────────────────────────────────────────────────────────────────
@router.get("/kutir-visits", response_model=list[KutirVisitOut], tags=["Kutir Visits"])
async def list_visits(
    response: Response,
    kutir_id: Optional[int] = Query(None),
    visited_by_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    def _apply_filters(q):
        if scope is not None:
            q = q.where(KutirVisit.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(KutirVisit.kutir_id == kutir_id)
        if visited_by_id:
            q = q.where(KutirVisit.visited_by_id == visited_by_id)
        return q

    count_q = _apply_filters(select(func.count()).select_from(KutirVisit))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(select(KutirVisit)).order_by(KutirVisit.visit_date.desc())
    if limit is not None:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    return result.scalars().all()


# ── Create ───────────────────────────────────────────────────────────────────
@router.post("/kutir-visits", response_model=KutirVisitOut, status_code=201, tags=["Kutir Visits"])
async def create_visit(
    data: KutirVisitCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    user=Depends(get_current_user),
    _=Depends(require_roles(MANAGE_VISITS)),
):
    require_kutir_in_scope(data.kutir_id, scope, detail="KutirVisit not found")
    payload = data.model_dump()
    # Stamp visitor from logged-in user when client omits visited_by_id (GUI Add).
    if payload.get("visited_by_id") is None:
        payload["visited_by_id"] = user.id
    obj = KutirVisit(**payload)
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


@router.get(
    "/kutir-visits/kutir-performance",
    response_model=KutirPerformanceReportOut,
    tags=["Kutir Visits"],
)
async def kutir_performance_report(
    date_from: date = Query(..., description="Inclusive visit start date"),
    date_to: date = Query(..., description="Inclusive visit end date"),
    level: GeoLevel = Query(..., description="Top-level geo pick: zone | district | cluster"),
    geo_id: int = Query(..., description="Selected zone/district/cluster id"),
    metric: KutirPerformanceMetric = Query(
        "kutir_performance",
        description="Visit rating field to average (1–5)",
    ),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    gs: GeoScope = Depends(get_geo_scope),
):
    """All kutirs with visits in range, ranked by average of the chosen rating under geo."""
    if date_to < date_from:
        raise HTTPException(400, "date_to must be on or after date_from")

    metric_label = KUTIR_PERFORMANCE_METRIC_LABELS[metric]
    score_col = getattr(KutirVisit, metric)

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
    else:
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

    title = f"Kutir Performance ({metric_label}) in " + " › ".join(geo_path)

    avg_score = func.avg(score_col)
    visit_count = func.count(KutirVisit.id)
    order = (avg_score.desc(), visit_count.desc(), Kutir.name.asc())

    q = (
        select(
            Kutir.id.label("kutir_id"),
            Kutir.name.label("kutir_name"),
            District.name.label("district_name"),
            Cluster.name.label("cluster_name"),
            visit_count.label("num_visits"),
            avg_score.label("avg_score"),
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
    )
    if scope is not None:
        if not scope:
            return KutirPerformanceReportOut(
                title=title,
                metric=metric,
                metric_label=metric_label,
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
        KutirPerformanceRow(
            kutir_id=r.kutir_id,
            kutir_name=r.kutir_name,
            district_name=r.district_name if show_district else None,
            cluster_name=r.cluster_name if show_cluster else None,
            num_visits=int(r.num_visits),
            avg_score=round(float(r.avg_score), 2),
        )
        for r in result.all()
    ]
    return KutirPerformanceReportOut(
        title=title,
        metric=metric,
        metric_label=metric_label,
        level=level,
        geo_id=geo_id,
        geo_path=geo_path,
        date_from=date_from,
        date_to=date_to,
        show_district=show_district,
        show_cluster=show_cluster,
        rows=rows,
    )


def _resolve_geo_filter(
    level: GeoLevel,
    geo_id: int,
    gs: GeoScope,
    zone: Optional[Zone],
    district: Optional[District],
    cluster: Optional[Cluster],
    area: Optional[Area],
):
    """Return (geo_path, geo_filter) after access checks; raises HTTPException."""
    if level == "zone":
        if gs.zone_ids is not None and geo_id not in gs.zone_ids:
            raise HTTPException(404, "Zone not found")
        if not zone:
            raise HTTPException(404, "Zone not found")
        return [zone.name], District.zone_id == geo_id
    if level == "district":
        if gs.district_ids is not None and geo_id not in gs.district_ids:
            raise HTTPException(404, "District not found")
        if not district:
            raise HTTPException(404, "District not found")
        path = [*( [zone.name] if zone else [] ), district.name]
        return path, Area.district_id == geo_id
    if gs.cluster_ids is not None and geo_id not in gs.cluster_ids:
        raise HTTPException(404, "Cluster not found")
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    path = [
        *( [zone.name] if zone else [] ),
        *( [district.name] if district else [] ),
        cluster.name,
    ]
    return path, Kutir.cluster_id == geo_id


# ── Kutir Visit Detailed Report ──────────────────────────────────────────────
@router.get(
    "/kutir-visits/detailed-report",
    response_model=VisitDetailedReportOut,
    tags=["Kutir Visits"],
)
async def visit_detailed_report(
    date_from: date = Query(..., description="Inclusive visit start date"),
    date_to: date = Query(..., description="Inclusive visit end date"),
    level: GeoLevel = Query(..., description="zone | district | cluster"),
    geo_id: int = Query(..., description="Selected zone/district/cluster id"),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
    gs: GeoScope = Depends(get_geo_scope),
):
    """Visit rows under geo for [date_from, date_to] with visitor + kutir geo header.

    Respects user kutir scope. Geo must be within caller's geo access.
    """
    if date_to < date_from:
        raise HTTPException(400, "date_to must be on or after date_from")

    zone = district = area = cluster = None
    if level == "zone":
        zone = await db.get(Zone, geo_id)
    elif level == "district":
        district = await db.get(District, geo_id)
        zone = await db.get(Zone, district.zone_id) if district else None
    else:
        cluster = await db.get(Cluster, geo_id)
        area = await db.get(Area, cluster.area_id) if cluster else None
        district = await db.get(District, area.district_id) if area else None
        zone = await db.get(Zone, district.zone_id) if district else None

    geo_path, geo_filter = _resolve_geo_filter(
        level, geo_id, gs, zone, district, cluster, area
    )
    title = "Kutir Visit Detailed Report in " + " › ".join(geo_path)

    if scope is not None and not scope:
        return VisitDetailedReportOut(
            title=title,
            level=level,
            geo_id=geo_id,
            geo_path=geo_path,
            date_from=date_from,
            date_to=date_to,
            rows=[],
        )

    q = (
        select(
            KutirVisit,
            User.first_name,
            User.last_name,
            User.username,
            User.title,
            Kutir.id.label("kutir_id"),
            Kutir.name.label("kutir_name"),
            Cluster.name.label("cluster_name"),
            Area.name.label("area_name"),
            District.name.label("district_name"),
            Zone.name.label("zone_name"),
            State.name.label("state_name"),
        )
        .select_from(KutirVisit)
        .join(Kutir, KutirVisit.kutir_id == Kutir.id)
        .join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
        .join(District, Area.district_id == District.id)
        .join(Zone, District.zone_id == Zone.id)
        .join(State, District.state_id == State.id)
        .outerjoin(User, KutirVisit.visited_by_id == User.id)
        .where(KutirVisit.visit_date >= date_from)
        .where(KutirVisit.visit_date <= date_to)
        .where(geo_filter)
        .order_by(KutirVisit.visit_date.desc(), Kutir.name.asc())
    )
    if scope is not None:
        q = q.where(Kutir.id.in_(scope))

    result = await db.execute(q)
    rows: list[VisitDetailedRow] = []
    for r in result.all():
        visit: KutirVisit = r[0]
        first, last, username, title_role = r[1], r[2], r[3], r[4]
        parts = [p for p in (first, last) if p]
        visitor_name = " ".join(parts) if parts else (username or "—")
        rows.append(
            VisitDetailedRow(
                visitor_name=visitor_name,
                visitor_role=title_role,
                state_name=r.state_name,
                zone_name=r.zone_name,
                district_name=r.district_name,
                area_name=r.area_name,
                cluster_name=r.cluster_name,
                kutir_id=r.kutir_id,
                kutir_name=r.kutir_name,
                visit=KutirVisitOut.model_validate(visit),
            )
        )
    return VisitDetailedReportOut(
        title=title,
        level=level,
        geo_id=geo_id,
        geo_path=geo_path,
        date_from=date_from,
        date_to=date_to,
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
