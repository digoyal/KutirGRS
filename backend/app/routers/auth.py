from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.auth import (
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.users import User, user_districts, user_areas, user_clusters, user_kutirs

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: str
    title: Optional[str]
    is_active: bool
    is_admin: bool
    district_ids: list[int] = []
    cluster_ids: list[int] = []
    kutir_ids: list[int] = []

    model_config = {"from_attributes": True}

TokenResponse.model_rebuild()


async def _me_out(user: User, db: AsyncSession) -> UserOut:
    """Build UserOut enriched with geo ID arrays, tracing up the hierarchy.

    Role assignment mapping and how we derive district_ids / cluster_ids:

      Admin                → no restrictions (all IDs stay empty = show everything)
      Regional Head        → user_zones (zone_id) — broad scope, no filtering needed
      District Anchor      → user_districts (district_id) — direct
      Education Coord      → user_areas (area_id) → derive district + clusters
      Cluster Coordinator  → user_clusters (cluster_id) → derive district
      Teacher              → user_kutirs (kutir_id) → derive cluster + district
    """
    from app.models.geo import Cluster, Area
    from app.models.kutirs import Kutir as KutirModel

    out = UserOut.model_validate(user)

    # ── Direct assignments ────────────────────────────────────────────────────
    r = await db.execute(select(user_districts.c.district_id).where(user_districts.c.user_id == user.id))
    out.district_ids = [row[0] for row in r.all()]

    r = await db.execute(select(user_clusters.c.cluster_id).where(user_clusters.c.user_id == user.id))
    out.cluster_ids = [row[0] for row in r.all()]

    r = await db.execute(select(user_kutirs.c.kutir_id).where(user_kutirs.c.user_id == user.id))
    out.kutir_ids = [row[0] for row in r.all()]

    # ── Education Coordinator: user_areas → derive district_ids + cluster_ids ─
    r = await db.execute(select(user_areas.c.area_id).where(user_areas.c.user_id == user.id))
    area_ids = [row[0] for row in r.all()]

    if area_ids:
        if not out.district_ids:
            # Area → District
            r = await db.execute(
                select(Area.district_id)
                .where(Area.id.in_(area_ids))
                .distinct()
            )
            out.district_ids = [row[0] for row in r.all()]
        if not out.cluster_ids:
            # Area → Clusters
            r = await db.execute(
                select(Cluster.id)
                .where(Cluster.area_id.in_(area_ids))
                .distinct()
            )
            out.cluster_ids = [row[0] for row in r.all()]

    # ── Cluster Coordinator: user_clusters → derive district_ids ─────────────
    if not out.district_ids and out.cluster_ids:
        r = await db.execute(
            select(Area.district_id)
            .join(Cluster, Cluster.area_id == Area.id)
            .where(Cluster.id.in_(out.cluster_ids))
            .distinct()
        )
        out.district_ids = [row[0] for row in r.all()]

    # ── Teacher: user_kutirs → derive cluster_ids + district_ids ─────────────
    if out.kutir_ids:
        if not out.cluster_ids:
            r = await db.execute(
                select(KutirModel.cluster_id)
                .where(KutirModel.id.in_(out.kutir_ids))
                .distinct()
            )
            out.cluster_ids = [row[0] for row in r.all()]
        if not out.district_ids and out.cluster_ids:
            r = await db.execute(
                select(Area.district_id)
                .join(Cluster, Cluster.area_id == Area.id)
                .where(Cluster.id.in_(out.cluster_ids))
                .distinct()
            )
            out.district_ids = [row[0] for row in r.all()]

    return out


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=await _me_out(user, db),
    )


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _me_out(current_user, db)
