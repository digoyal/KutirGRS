from typing import Optional, List
from pydantic import BaseModel

from app.roles import TITLES as VALID_TITLES


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
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


class UserUpdate(BaseModel):
    email: Optional[str] = None
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


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
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
