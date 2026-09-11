from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.geo import Zone, District, Area, Cluster, ExamCenter
from app.schemas.geo import (
    ZoneCreate, ZoneUpdate, ZoneOut,
    DistrictCreate, DistrictUpdate, DistrictOut,
    AreaCreate, AreaUpdate, AreaOut,
    ClusterCreate, ClusterUpdate, ClusterOut,
    ExamCenterCreate, ExamCenterUpdate, ExamCenterOut,
)

router = APIRouter(prefix="/geo", tags=["Geo"])


# ── Zones ─────────────────────────────────────────────────────────────────────

@router.get("/zones", response_model=list[ZoneOut])
async def list_zones(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Zone).order_by(Zone.name))
    return result.scalars().all()

@router.post("/zones", response_model=ZoneOut, status_code=201)
async def create_zone(body: ZoneCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
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
async def update_zone(zone_id: int, body: ZoneUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Zone, zone_id)
    if not obj:
        raise HTTPException(404, "Zone not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/zones/{zone_id}", status_code=204)
async def delete_zone(zone_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Zone, zone_id)
    if not obj:
        raise HTTPException(404, "Zone not found")
    await db.delete(obj)
    await db.commit()


# ── Districts ─────────────────────────────────────────────────────────────────

@router.get("/districts", response_model=list[DistrictOut])
async def list_districts(
    zone_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(District).order_by(District.name)
    if zone_id:
        q = q.where(District.zone_id == zone_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/districts", response_model=DistrictOut, status_code=201)
async def create_district(body: DistrictCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
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
async def update_district(district_id: int, body: DistrictUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(District, district_id)
    if not obj:
        raise HTTPException(404, "District not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/districts/{district_id}", status_code=204)
async def delete_district(district_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(District, district_id)
    if not obj:
        raise HTTPException(404, "District not found")
    await db.delete(obj)
    await db.commit()


# ── Areas ─────────────────────────────────────────────────────────────────────

@router.get("/areas", response_model=list[AreaOut])
async def list_areas(
    district_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(Area).order_by(Area.name)
    if district_id:
        q = q.where(Area.district_id == district_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/areas", response_model=AreaOut, status_code=201)
async def create_area(body: AreaCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
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
async def update_area(area_id: int, body: AreaUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Area, area_id)
    if not obj:
        raise HTTPException(404, "Area not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/areas/{area_id}", status_code=204)
async def delete_area(area_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Area, area_id)
    if not obj:
        raise HTTPException(404, "Area not found")
    await db.delete(obj)
    await db.commit()


# ── Clusters ──────────────────────────────────────────────────────────────────

@router.get("/clusters", response_model=list[ClusterOut])
async def list_clusters(
    area_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(Cluster).order_by(Cluster.name)
    if area_id:
        q = q.where(Cluster.area_id == area_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/clusters", response_model=ClusterOut, status_code=201)
async def create_cluster(body: ClusterCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
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
async def update_cluster(cluster_id: int, body: ClusterUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Cluster, cluster_id)
    if not obj:
        raise HTTPException(404, "Cluster not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/clusters/{cluster_id}", status_code=204)
async def delete_cluster(cluster_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Cluster, cluster_id)
    if not obj:
        raise HTTPException(404, "Cluster not found")
    await db.delete(obj)
    await db.commit()


# ── ExamCenters ───────────────────────────────────────────────────────────────

@router.get("/exam-centers", response_model=list[ExamCenterOut])
async def list_exam_centers(
    district_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(ExamCenter).order_by(ExamCenter.name)
    if district_id:
        q = q.where(ExamCenter.district_id == district_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/exam-centers", response_model=ExamCenterOut, status_code=201)
async def create_exam_center(body: ExamCenterCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = ExamCenter(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/exam-centers/{ec_id}", response_model=ExamCenterOut)
async def get_exam_center(ec_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    return obj

@router.put("/exam-centers/{ec_id}", response_model=ExamCenterOut)
async def update_exam_center(ec_id: int, body: ExamCenterUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/exam-centers/{ec_id}", status_code=204)
async def delete_exam_center(ec_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(ExamCenter, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCenter not found")
    await db.delete(obj)
    await db.commit()
