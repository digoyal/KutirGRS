from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import (
    get_current_user,
    require_roles,
    get_geo_scope,
    GeoScope,
    require_district_in_geo_scope,
)
from app.geo_assignments import list_geo_assignment_rows
from app.roles import MANAGE_GEOGRAPHY, MANAGE_EXAM_CENTERS
from app.geo_delete import (
    delete_area_if_allowed,
    delete_cluster_if_allowed,
    delete_district_if_allowed,
    delete_zone_if_allowed,
)
from app.models.geo import State, Zone, District, Area, Cluster, ExamCenter
from app.schemas.geo import (
    StateCreate, StateUpdate, StateOut,
    ZoneCreate, ZoneUpdate, ZoneOut,
    DistrictCreate, DistrictUpdate, DistrictOut,
    AreaCreate, AreaUpdate, AreaOut,
    ClusterCreate, ClusterUpdate, ClusterOut,
    ExamCenterCreate, ExamCenterUpdate, ExamCenterOut,
    GeoAssignmentOut,
)

router = APIRouter(prefix="/geo", tags=["Geo"])


# ── Geo assignments (M2M user ↔ geo) ─────────────────────────────────────────

@router.get("/assignments", response_model=list[GeoAssignmentOut])
async def list_geo_assignments(
    entity_level: str = Query(
        ...,
        description="Zone | District | Area | Cluster — one row per entity at this level",
    ),
    zone_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(get_current_user),
):
    if entity_level not in ("Zone", "District", "Area", "Cluster"):
        raise HTTPException(400, "Invalid entity_level")
    raw = await list_geo_assignment_rows(
        db,
        gs,
        entity_level=entity_level,
        zone_id=zone_id,
        district_id=district_id,
        area_id=area_id,
        cluster_id=cluster_id,
    )
    return [GeoAssignmentOut(**r) for r in raw]


# ── States ────────────────────────────────────────────────────────────────────

@router.get("/states", response_model=list[StateOut])
async def list_states(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(State).order_by(State.name))
    return result.scalars().all()

@router.post("/states", response_model=StateOut, status_code=201)
async def create_state(body: StateCreate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = State(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/states/{state_id}", response_model=StateOut)
async def get_state(state_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(State, state_id)
    if not obj:
        raise HTTPException(404, "State not found")
    return obj

@router.put("/states/{state_id}", response_model=StateOut)
async def update_state(state_id: int, body: StateUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(State, state_id)
    if not obj:
        raise HTTPException(404, "State not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/states/{state_id}", status_code=204)
async def delete_state(state_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(State, state_id)
    if not obj:
        raise HTTPException(404, "State not found")
    await db.delete(obj)
    await db.commit()


# ── Zones ─────────────────────────────────────────────────────────────────────

@router.get("/zones", response_model=list[ZoneOut])
async def list_zones(db: AsyncSession = Depends(get_db), gs: GeoScope = Depends(get_geo_scope)):
    q = select(Zone).order_by(Zone.name)
    if gs.zone_ids is not None:
        q = q.where(Zone.id.in_(gs.zone_ids))
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/zones", response_model=ZoneOut, status_code=201)
async def create_zone(body: ZoneCreate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = Zone(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/zones/{zone_id}", response_model=ZoneOut)
async def get_zone(zone_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Zone, zone_id)
    if not obj:
        raise HTTPException(404, "Zone not found")
    return obj

@router.put("/zones/{zone_id}", response_model=ZoneOut)
async def update_zone(zone_id: int, body: ZoneUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Zone, zone_id)
    if not obj:
        raise HTTPException(404, "Zone not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/zones/{zone_id}", status_code=204)
async def delete_zone(zone_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Zone, zone_id)
    if not obj:
        raise HTTPException(404, "Zone not found")
    await delete_zone_if_allowed(db, obj)


# ── Districts ─────────────────────────────────────────────────────────────────

@router.get("/districts", response_model=list[DistrictOut])
async def list_districts(
    zone_id: Optional[int] = Query(None),
    parivaar_presence: Optional[bool] = Query(None),
    # Opt-in: skip role geo filter (e.g. Admissions GRS School District picker).
    unscoped: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
):
    q = select(District).order_by(District.name)
    if not unscoped and gs.district_ids is not None:
        q = q.where(District.id.in_(gs.district_ids))
    if zone_id:
        q = q.where(District.zone_id == zone_id)
    if parivaar_presence is not None:
        q = q.where(District.parivaar_presence == parivaar_presence)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/districts", response_model=DistrictOut, status_code=201)
async def create_district(body: DistrictCreate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = District(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/districts/{district_id}", response_model=DistrictOut)
async def get_district(district_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(District, district_id)
    if not obj:
        raise HTTPException(404, "District not found")
    return obj

@router.put("/districts/{district_id}", response_model=DistrictOut)
async def update_district(district_id: int, body: DistrictUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(District, district_id)
    if not obj:
        raise HTTPException(404, "District not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/districts/{district_id}", status_code=204)
async def delete_district(district_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(District, district_id)
    if not obj:
        raise HTTPException(404, "District not found")
    await delete_district_if_allowed(db, obj)


# ── Areas ─────────────────────────────────────────────────────────────────────

@router.get("/areas", response_model=list[AreaOut])
async def list_areas(
    district_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
):
    q = select(Area).order_by(Area.name)
    if gs.area_ids is not None:
        q = q.where(Area.id.in_(gs.area_ids))
    if district_id:
        q = q.where(Area.district_id == district_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/areas", response_model=AreaOut, status_code=201)
async def create_area(body: AreaCreate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = Area(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/areas/{area_id}", response_model=AreaOut)
async def get_area(area_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Area, area_id)
    if not obj:
        raise HTTPException(404, "Area not found")
    return obj

@router.put("/areas/{area_id}", response_model=AreaOut)
async def update_area(area_id: int, body: AreaUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Area, area_id)
    if not obj:
        raise HTTPException(404, "Area not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/areas/{area_id}", status_code=204)
async def delete_area(area_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Area, area_id)
    if not obj:
        raise HTTPException(404, "Area not found")
    await delete_area_if_allowed(db, obj)


# ── Clusters ──────────────────────────────────────────────────────────────────

@router.get("/clusters", response_model=list[ClusterOut])
async def list_clusters(
    area_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
):
    q = select(Cluster).order_by(Cluster.name)
    if gs.cluster_ids is not None:
        q = q.where(Cluster.id.in_(gs.cluster_ids))
    if area_id:
        q = q.where(Cluster.area_id == area_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/clusters", response_model=ClusterOut, status_code=201)
async def create_cluster(body: ClusterCreate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = Cluster(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/clusters/{cluster_id}", response_model=ClusterOut)
async def get_cluster(cluster_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Cluster, cluster_id)
    if not obj:
        raise HTTPException(404, "Cluster not found")
    return obj

@router.put("/clusters/{cluster_id}", response_model=ClusterOut)
async def update_cluster(cluster_id: int, body: ClusterUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Cluster, cluster_id)
    if not obj:
        raise HTTPException(404, "Cluster not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/clusters/{cluster_id}", status_code=204)
async def delete_cluster(cluster_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_roles(MANAGE_GEOGRAPHY))):
    obj = await db.get(Cluster, cluster_id)
    if not obj:
        raise HTTPException(404, "Cluster not found")
    await delete_cluster_if_allowed(db, obj)


# ── ExamCenters ───────────────────────────────────────────────────────────────

@router.get("/exam-centers", response_model=list[ExamCenterOut])
async def list_exam_centers(
    district_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(get_current_user),
):
    q = select(ExamCenter).order_by(ExamCenter.name)
    if gs.district_ids is not None:
        q = q.where(ExamCenter.district_id.in_(gs.district_ids))
    if district_id:
        if gs.district_ids is not None and district_id not in gs.district_ids:
            return []
        q = q.where(ExamCenter.district_id == district_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/exam-centers", response_model=ExamCenterOut, status_code=201)
async def create_exam_center(
    body: ExamCenterCreate,
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(require_roles(MANAGE_EXAM_CENTERS)),
):
    require_district_in_geo_scope(body.district_id, gs, detail="ExamCenter not found")
    obj = ExamCenter(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/exam-centers/{ec_id}", response_model=ExamCenterOut)
async def get_exam_center(
    ec_id: int,
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(get_current_user),
):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    require_district_in_geo_scope(obj.district_id, gs, detail="ExamCenter not found")
    return obj

@router.put("/exam-centers/{ec_id}", response_model=ExamCenterOut)
async def update_exam_center(
    ec_id: int,
    body: ExamCenterUpdate,
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(require_roles(MANAGE_EXAM_CENTERS)),
):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    require_district_in_geo_scope(obj.district_id, gs, detail="ExamCenter not found")
    data = body.model_dump(exclude_unset=True)
    if "district_id" in data:
        require_district_in_geo_scope(data["district_id"], gs, detail="ExamCenter not found")
    for k, v in data.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/exam-centers/{ec_id}", status_code=204)
async def delete_exam_center(
    ec_id: int,
    db: AsyncSession = Depends(get_db),
    gs: GeoScope = Depends(get_geo_scope),
    _=Depends(require_roles(MANAGE_EXAM_CENTERS)),
):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    require_district_in_geo_scope(obj.district_id, gs, detail="ExamCenter not found")
    await db.delete(obj)
    await db.commit()
