import hashlib
import logging
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.mail import send_password_reset_email
from app.models.password_reset import PasswordResetToken
from app.models.users import User, user_districts, user_areas, user_clusters, user_kutirs

log = logging.getLogger("kutirgrs.auth")

router = APIRouter(prefix="/auth", tags=["Auth"])

# Light in-process rate limit: key → timestamps of recent hits.
_rate_hits: dict[str, list[float]] = defaultdict(list)


def _rate_limited(key: str, *, limit: int, window_sec: int = 3600) -> bool:
    now = time.monotonic()
    hits = [t for t in _rate_hits[key] if now - t < window_sec]
    _rate_hits[key] = hits
    if len(hits) >= limit:
        return True
    _rate_hits[key].append(now)
    return False


def _hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


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


class PasswordResetRequestIn(BaseModel):
    """Username or email — response is always the same generic success."""
    identifier: str = Field(..., min_length=1, max_length=254)


class PasswordResetRequestOut(BaseModel):
    detail: str = (
        "If an account with that username or email exists and has an email on file, "
        "a reset link has been sent."
    )


class PasswordResetConfirmIn(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=128)


class PasswordResetConfirmOut(BaseModel):
    detail: str = "Password updated. You can sign in with your new password."


class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordOut(BaseModel):
    detail: str = "Password updated."


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


@router.post("/change-password", response_model=ChangePasswordOut)
async def change_password(
    body: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Any authenticated user may change their own password after verifying the current one."""
    if not verify_password(body.current_password, current_user.password):
        # 400 (not 401): wrong current password must not clear the session JWT on the client.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    if body.new_password == body.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )
    current_user.password = hash_password(body.new_password)
    await db.commit()
    return ChangePasswordOut()


@router.post("/request-password-reset", response_model=PasswordResetRequestOut)
async def request_password_reset(
    body: PasswordResetRequestIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Always return a generic success. Send magic link only when a matching active user has email."""
    limit = settings.PASSWORD_RESET_RATE_LIMIT_PER_HOUR
    client = request.client.host if request.client else "unknown"
    ident = body.identifier.strip().lower()
    if _rate_limited(f"pwreset:{client}:{ident}", limit=limit) or _rate_limited(
        f"pwreset-ip:{client}", limit=limit * 3
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset requests. Try again later.",
        )

    raw = body.identifier.strip()
    result = await db.execute(
        select(User).where(
            or_(
                User.username == raw,
                func.lower(User.email) == raw.lower(),
            )
        )
    )
    user = result.scalar_one_or_none()

    if user and user.is_active and (user.email or "").strip():
        plain = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(plain)
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_MINUTES)
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires,
                used_at=None,
                created_at=now,
            )
        )
        await db.commit()

        base = (settings.FRONTEND_BASE_URL or "http://localhost:5173").rstrip("/")
        reset_url = f"{base}/reset-password?token={plain}"
        try:
            send_password_reset_email(to=user.email.strip(), reset_url=reset_url)
        except Exception:
            log.exception("Failed to send password-reset email to user_id=%s", user.id)
            # Still return generic success — do not leak delivery failures.

    return PasswordResetRequestOut()


@router.post("/reset-password", response_model=PasswordResetConfirmOut)
async def reset_password(
    body: PasswordResetConfirmIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client = request.client.host if request.client else "unknown"
    if _rate_limited(f"pwconfirm-ip:{client}", limit=30):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later.",
        )

    token_hash = _hash_reset_token(body.token.strip())
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    row = result.scalar_one_or_none()
    expired = False
    if row is not None:
        exp = row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        expired = exp < now
    if not row or row.used_at is not None or expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link.",
        )

    user_result = await db.execute(select(User).where(User.id == row.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link.",
        )

    user.password = hash_password(body.new_password)
    row.used_at = now
    # Invalidate other unused tokens for this user.
    others = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != row.id,
        )
    )
    for other in others.scalars().all():
        other.used_at = now
    await db.commit()
    return PasswordResetConfirmOut()
