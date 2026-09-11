from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.donors import Donor
from app.schemas.donors import DonorCreate, DonorUpdate, DonorOut

router = APIRouter(prefix="/donors", tags=["Donors"])


@router.get("", response_model=list[DonorOut])
async def list_donors(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Donor).order_by(Donor.name))
    return result.scalars().all()


@router.post("", response_model=DonorOut, status_code=201)
async def create_donor(body: DonorCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = Donor(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{donor_id}", response_model=DonorOut)
async def get_donor(donor_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Donor, donor_id)
    if not obj:
        raise HTTPException(404, "Donor not found")
    return obj


@router.put("/{donor_id}", response_model=DonorOut)
async def update_donor(donor_id: int, body: DonorUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Donor, donor_id)
    if not obj:
        raise HTTPException(404, "Donor not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{donor_id}", status_code=204)
async def delete_donor(donor_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Donor, donor_id)
    if not obj:
        raise HTTPException(404, "Donor not found")
    await db.delete(obj)
    await db.commit()
