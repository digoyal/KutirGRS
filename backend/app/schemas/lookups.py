from typing import Optional
from pydantic import BaseModel


class SubjectRef(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    model_config = {"from_attributes": True}


class CategoryBase(BaseModel):
    name: str
    code: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    model_config = {"from_attributes": True}


class SubCategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    category_id: int

class SubCategoryCreate(SubCategoryBase):
    pass

class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category_id: Optional[int] = None

class SubCategoryOut(SubCategoryBase):
    id: int
    model_config = {"from_attributes": True}


class ExamCategoryBase(BaseModel):
    name: str
    code: Optional[str] = None

class ExamCategoryCreate(ExamCategoryBase):
    pass

class ExamCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class ExamCategoryOut(ExamCategoryBase):
    id: int
    model_config = {"from_attributes": True}


class NoExamReasonBase(BaseModel):
    reason: str

class NoExamReasonCreate(NoExamReasonBase):
    pass

class NoExamReasonUpdate(BaseModel):
    reason: Optional[str] = None

class NoExamReasonOut(NoExamReasonBase):
    id: int
    model_config = {"from_attributes": True}


class NoAdmitReasonBase(BaseModel):
    reason: str

class NoAdmitReasonCreate(NoAdmitReasonBase):
    pass

class NoAdmitReasonUpdate(BaseModel):
    reason: Optional[str] = None

class NoAdmitReasonOut(NoAdmitReasonBase):
    id: int
    model_config = {"from_attributes": True}


class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class SubjectOut(SubjectBase):
    id: int
    model_config = {"from_attributes": True}


# ── SchoolType ────────────────────────────────────────────────────────────────

class SchoolTypeBase(BaseModel):
    name: str

class SchoolTypeCreate(SchoolTypeBase):
    pass

class SchoolTypeUpdate(BaseModel):
    name: Optional[str] = None

class SchoolTypeOut(SchoolTypeBase):
    id: int
    model_config = {"from_attributes": True}


# ── ExamType ──────────────────────────────────────────────────────────────────

class ExamTypeBase(BaseModel):
    name: str

class ExamTypeCreate(ExamTypeBase):
    school_type_ids: list[int] = []

class ExamTypeUpdate(BaseModel):
    name: Optional[str] = None
    school_type_ids: Optional[list[int]] = None

class ExamTypeOut(ExamTypeBase):
    id: int
    school_types: list[SchoolTypeOut] = []
    model_config = {"from_attributes": True}
