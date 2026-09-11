from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin, hash_password
from app.models.users import User
from app.schemas.users import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    is_active: Optional[bool] = Query(None),
    title: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    q = select(User).order_by(User.username)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if title:
        q = q.where(User.title == title)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    # check username uniqueness
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"Username '{body.username}' already taken")

    data = body.model_dump()
    data["password"] = hash_password(data["password"])
    obj = User(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")
    return obj


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")
    data = body.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["password"] = hash_password(data["password"])
    elif "password" in data:
        del data["password"]
    for k, v in data.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(require_admin)):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    obj = await db.get(User, user_id)
    if not obj:
        raise HTTPException(404, "User not found")
    await db.delete(obj)
    await db.commit()
