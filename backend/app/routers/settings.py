from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import Any

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.settings import AppSetting

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingOut(BaseModel):
    key: str
    value: Any

    class Config:
        from_attributes = True


@router.get("/{key}", response_model=SettingOut)
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(AppSetting, key)
    if not obj:
        return SettingOut(key=key, value=None)
    return obj


@router.put("/{key}", response_model=SettingOut)
async def put_setting(
    key: str,
    body: Any = Body(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    obj = await db.get(AppSetting, key)
    if obj:
        obj.value = body
        flag_modified(obj, "value")   # force SQLAlchemy to treat JSON as dirty
    else:
        obj = AppSetting(key=key, value=body)
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
