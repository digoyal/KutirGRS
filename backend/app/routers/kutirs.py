from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin, get_scope
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area, District, Zone
from app.models.users import User, user_kutirs
from app.schemas.kutirs import KutirCreate, KutirUpdate, KutirOut, KutirDetail, TeacherMin

router = APIRouter(prefix="/kutirs", tags=["Kutirs"])


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

    # Fetch assigned teachers via user_kutirs (managed from Users form)
    t_result = await db.execute(
        select(User)
        .join(user_kutirs, User.id == user_kutirs.c.user_id)
        .where(user_kutirs.c.kutir_id == kutir_id)
        .order_by(User.first_name, User.last_name)
    )
    teachers = t_result.scalars().all()

    detail = KutirDetail.model_validate(obj)
    detail.teachers = [TeacherMin.model_validate(t) for t in teachers]
    return detail


@router.get("", response_model=list[KutirOut])
async def list_kutirs(
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    kutir_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    q = select(Kutir).order_by(Kutir.name)
    if scope is not None:
        q = q.where(Kutir.id.in_(scope))
    if cluster_id:
        q = q.where(Kutir.cluster_id == cluster_id)
    if district_id:
        q = q.where(Kutir.district_id == district_id)
    if kutir_type:
        q = q.where(Kutir.kutir_type == kutir_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=KutirDetail, status_code=201)
async def create_kutir(body: KutirCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = Kutir(**body.model_dump())
    db.add(obj)
    await db.flush()
    await db.commit()
    return await _get_kutir_detail(db, obj.id)


@router.get("/{kutir_id}", response_model=KutirDetail)
async def get_kutir(
    kutir_id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    if scope is not None and kutir_id not in scope:
        raise HTTPException(404, "Kutir not found")
    return await _get_kutir_detail(db, kutir_id)


@router.put("/{kutir_id}", response_model=KutirDetail)
async def update_kutir(kutir_id: int, body: KutirUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    return await _get_kutir_detail(db, kutir_id)


@router.delete("/{kutir_id}", status_code=204)
async def delete_kutir(kutir_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Kutir, kutir_id)
    if not obj:
        raise HTTPException(404, "Kutir not found")
    await db.delete(obj)
    await db.commit()
