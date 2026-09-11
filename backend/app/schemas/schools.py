from typing import Optional
from pydantic import BaseModel

SCHOOL_TYPES = ["EMRS","JNV","KSP","MRS","GNV","KGBV","SportsBoys","SportsGirls","Other"]
STATES = ["Madhya Pradesh","Jharkhand","Chhattisgarh"]

class SchoolBase(BaseModel):
    name: str
    school_type: str
    street: Optional[str] = None
    city: Optional[str] = None
    district_id: Optional[int] = None
    state: str = "Madhya Pradesh"
    pincode: Optional[str] = None

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    school_type: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    district_id: Optional[int] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class SchoolOut(SchoolBase):
    id: int
    model_config = {"from_attributes": True}
