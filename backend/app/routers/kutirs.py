from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area, District, Zone
from app.schemas.kutirs import KutirCreate, KutirUpdate, KutirOut, KutirDetail

router = APIRouter(prefix="/kutirs", tags=["Kutirs"])


@router.get("", response_model=list[KutirOut])
async def list_kutirs(
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    kutir_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(Kutir).order_by(Kutir.name)
    if cluster_id:
        q = q.where(Kutir.cluster_id == cluster_id)
    if district_id:
        q = q.where(Kutir.district_id == district_id)
    if kutir_type:
        q = q.where(Kutir.kutir_type == kutir_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=KutirOut, status_code=201)
async def create_kutir(body: KutirCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = Kutir(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{kutir_id}", response_model=KutirDetail)
async def get_kutir(kutir_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = (
        select(Kutir)
        .where(Kutir.id == kutir_id)
        .options(
            selectinload(Kutir.cluster).selectinload(Cluster.area)
            .selectinload(Area.district).selectinload(District.zone),
            selectinload(Kutir.teacher),
        )
    )
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Kutir not found")
    return obj


@router.put("/{kutir_id}", response_model=KutirOut)
async def update_kutir(kutir_id: int, body: KutirUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{kutir_id}", status_code=204)
async def delete_kutir(kutir_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    await db.delete(obj)
    await db.commit()
