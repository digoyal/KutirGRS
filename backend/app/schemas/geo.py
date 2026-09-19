from typing import Optional
from pydantic import BaseModel


# ── Zone ──────────────────────────────────────────────────────────────────────

class ZoneBase(BaseModel):
    name: str

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None

class ZoneOut(ZoneBase):
    id: int
    model_config = {"from_attributes": True}


# ── District ──────────────────────────────────────────────────────────────────

class DistrictBase(BaseModel):
    name: str
    zone_id: int

class DistrictCreate(DistrictBase):
    pass

class DistrictUpdate(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[int] = None

class DistrictOut(DistrictBase):
    id: int
    model_config = {"from_attributes": True}


# ── Area ──────────────────────────────────────────────────────────────────────

class AreaBase(BaseModel):
    name: str
    district_id: int

class AreaCreate(AreaBase):
    pass

class AreaUpdate(BaseModel):
    name: Optional[str] = None
    district_id: Optional[int] = None

class AreaOut(AreaBase):
    id: int
    model_config = {"from_attributes": True}


# ── Cluster ───────────────────────────────────────────────────────────────────

class ClusterBase(BaseModel):
    name: str
    area_id: int

class ClusterCreate(ClusterBase):
    pass

class ClusterUpdate(BaseModel):
    name: Optional[str] = None
    area_id: Optional[int] = None

class ClusterOut(ClusterBase):
    id: int
    model_config = {"from_attributes": True}


# ── ExamCenter ────────────────────────────────────────────────────────────────

class ExamCenterBase(BaseModel):
    name: str
    district_id: Optional[int] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class ExamCenterCreate(ExamCenterBase):
    pass

class ExamCenterUpdate(BaseModel):
    name: Optional[str] = None
    district_id: Optional[int] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class ExamCenterOut(ExamCenterBase):
    id: int
    model_config = {"from_attributes": True}
