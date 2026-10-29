from typing import Optional, List
from pydantic import BaseModel, field_validator

from app.roles import TITLES as VALID_TITLES


def _require_nonblank_email(v: str) -> str:
    """API create/update require a non-blank email (DB column is NOT NULL after 025)."""
    s = (v or "").strip()
    if not s:
        raise ValueError("email is required")
    return s


class UserCreate(BaseModel):
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    password: str
    # Role-specific geo assignments (M2M)
    zone_ids: List[int] = []
    district_ids: List[int] = []
    area_ids: List[int] = []
    cluster_ids: List[int] = []
    kutir_ids: List[int] = []  # Teacher only, max 1
    is_active: bool = True
    # Enforced in users router: only Admin/superuser may set True; stripped otherwise
    is_superuser: bool = False

    @field_validator("email")
    @classmethod
    def email_required(cls, v: str) -> str:
        return _require_nonblank_email(v)


class UserUpdate(BaseModel):
    # Required on every update so blank legacy rows must be filled when editing.
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    # Role-specific geo assignments (M2M) — None means "don't change"
    zone_ids: Optional[List[int]] = None
    district_ids: Optional[List[int]] = None
    area_ids: Optional[List[int]] = None
    cluster_ids: Optional[List[int]] = None
    kutir_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None
    # Enforced in users router: only Admin/superuser may set; non-admins stripped/rejected
    is_superuser: Optional[bool] = None
    password: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_required(cls, v: str) -> str:
        return _require_nonblank_email(v)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    zone_ids: List[int] = []
    district_ids: List[int] = []
    area_ids: List[int] = []
    cluster_ids: List[int] = []
    kutir_ids: List[int] = []
    is_active: bool
    is_superuser: bool
    model_config = {"from_attributes": True}
