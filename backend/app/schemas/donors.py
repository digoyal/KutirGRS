from typing import Optional
from pydantic import BaseModel

class DonorBase(BaseModel):
    name: str
    contact: Optional[str] = None
    notes: Optional[str] = None

class DonorCreate(DonorBase):
    pass

class DonorUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None

class DonorOut(DonorBase):
    id: int
    model_config = {"from_attributes": True}
