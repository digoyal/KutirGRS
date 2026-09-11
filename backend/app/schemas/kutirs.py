from typing import Optional
from pydantic import BaseModel

KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"]
STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"]

class KutirBase(BaseModel):
    name: str
    kutir_type: str = "Seva Kutir"
    cluster_id: int
    district_id: Optional[int] = None
    village: Optional[str] = None
    street: Optional[str] = None
    state: str = "Madhya Pradesh"
    pincode: Optional[str] = None
    teacher_id: Optional[int] = None
    donor_id: Optional[int] = None
    enrollment_5th: Optional[int] = None
    enrollment_8th: Optional[int] = None

class KutirCreate(KutirBase):
    pass

class KutirUpdate(BaseModel):
    name: Optional[str] = None
    kutir_type: Optional[str] = None
    cluster_id: Optional[int] = None
    district_id: Optional[int] = None
    village: Optional[str] = None
    street: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    teacher_id: Optional[int] = None
    donor_id: Optional[int] = None
    enrollment_5th: Optional[int] = None
    enrollment_8th: Optional[int] = None

class KutirOut(KutirBase):
    id: int
    model_config = {"from_attributes": True}
