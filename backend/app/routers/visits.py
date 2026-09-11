from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import os, uuid, shutil

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.visits import KutirVisit
from app.schemas.visits import KutirVisitCreate, KutirVisitUpdate, KutirVisitOut
from app.config import settings

router = APIRouter()


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
    _=Depends(get_current_user),
):
    q = select(KutirVisit)
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
    _=Depends(get_current_user),
):
    obj = KutirVisit(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Get one ──────────────────────────────────────────────────────────────────
@router.get("/kutir-visits/{id}", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def get_visit(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    return obj


# ── Update ───────────────────────────────────────────────────────────────────
@router.patch("/kutir-visits/{id}", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def update_visit(
    id: int, data: KutirVisitUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/kutir-visits/{id}", status_code=204, tags=["Kutir Visits"])
async def delete_visit(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    await db.delete(obj)
    await db.commit()


# ── Photo upload ─────────────────────────────────────────────────────────────
@router.post("/kutir-visits/{id}/photo", response_model=KutirVisitOut, tags=["Kutir Visits"])
async def upload_visit_photo(
    id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(KutirVisit, id)
    if not obj:
        raise HTTPException(404, "KutirVisit not found")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(_media("visit_photos"), filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    obj.visit_photo = f"visit_photos/{filename}"
    await db.commit()
    await db.refresh(obj)
    return obj
