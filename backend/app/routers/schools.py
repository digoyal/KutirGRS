from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.schools import GovtResidentialSchool
from app.schemas.schools import SchoolCreate, SchoolUpdate, SchoolOut

router = APIRouter(prefix="/schools", tags=["Schools"])


@router.get("", response_model=list[SchoolOut])
async def list_schools(
    district_id: Optional[int] = Query(None),
    school_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(GovtResidentialSchool).order_by(GovtResidentialSchool.name)
    if district_id:
        q = q.where(GovtResidentialSchool.district_id == district_id)
    if school_type:
        q = q.where(GovtResidentialSchool.school_type == school_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=SchoolOut, status_code=201)
async def create_school(body: SchoolCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = GovtResidentialSchool(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{school_id}", response_model=SchoolOut)
async def get_school(school_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(GovtResidentialSchool, school_id)
    if not obj:
        raise HTTPException(404, "School not found")
    return obj


@router.put("/{school_id}", response_model=SchoolOut)
async def update_school(school_id: int, body: SchoolUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(GovtResidentialSchool, school_id)
    if not obj:
        raise HTTPException(404, "School not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{school_id}", status_code=204)
async def delete_school(school_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(GovtResidentialSchool, school_id)
    if not obj:
        raise HTTPException(404, "School not found")
    await db.delete(obj)
    await db.commit()
