from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.lookups import (
    Category, SubCategory, ExamCategory,
    NoExamReason, NoAdmitReason, Subject,
)
from app.schemas.lookups import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    SubCategoryCreate, SubCategoryUpdate, SubCategoryOut,
    ExamCategoryCreate, ExamCategoryUpdate, ExamCategoryOut,
    NoExamReasonCreate, NoExamReasonUpdate, NoExamReasonOut,
    NoAdmitReasonCreate, NoAdmitReasonUpdate, NoAdmitReasonOut,
    SubjectCreate, SubjectUpdate, SubjectOut,
)

router = APIRouter(prefix="/lookups", tags=["Lookups"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = Category(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/categories/{cat_id}", response_model=CategoryOut)
async def get_category(cat_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Category, cat_id)
    if not obj:
        raise HTTPException(404, "Category not found")
    return obj

@router.put("/categories/{cat_id}", response_model=CategoryOut)
async def update_category(cat_id: int, body: CategoryUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Category, cat_id)
    if not obj:
        raise HTTPException(404, "Category not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/categories/{cat_id}", status_code=204)
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Category, cat_id)
    if not obj:
        raise HTTPException(404, "Category not found")
    sub_count_result = await db.execute(
        select(SubCategory).where(SubCategory.category_id == cat_id)
    )
    sub_count = len(sub_count_result.scalars().all())
    if sub_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete: this category has {sub_count} sub-categor{'y' if sub_count == 1 else 'ies'}. "
            "Delete all sub-categories first."
        )
    await db.delete(obj)
    await db.commit()


# ── SubCategories ─────────────────────────────────────────────────────────────

@router.get("/sub-categories", response_model=list[SubCategoryOut])
async def list_sub_categories(
    category_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(SubCategory).order_by(SubCategory.name)
    if category_id:
        q = q.where(SubCategory.category_id == category_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/sub-categories", response_model=SubCategoryOut, status_code=201)
async def create_sub_category(body: SubCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = SubCategory(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/sub-categories/{sc_id}", response_model=SubCategoryOut)
async def get_sub_category(sc_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(SubCategory, sc_id)
    if not obj:
        raise HTTPException(404, "SubCategory not found")
    return obj

@router.put("/sub-categories/{sc_id}", response_model=SubCategoryOut)
async def update_sub_category(sc_id: int, body: SubCategoryUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(SubCategory, sc_id)
    if not obj:
        raise HTTPException(404, "SubCategory not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/sub-categories/{sc_id}", status_code=204)
async def delete_sub_category(sc_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(SubCategory, sc_id)
    if not obj:
        raise HTTPException(404, "SubCategory not found")
    await db.delete(obj)
    await db.commit()


# ── ExamCategories ────────────────────────────────────────────────────────────

@router.get("/exam-categories", response_model=list[ExamCategoryOut])
async def list_exam_categories(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(ExamCategory).order_by(ExamCategory.name))
    return result.scalars().all()

@router.post("/exam-categories", response_model=ExamCategoryOut, status_code=201)
async def create_exam_category(body: ExamCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = ExamCategory(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/exam-categories/{ec_id}", response_model=ExamCategoryOut)
async def get_exam_category(ec_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(ExamCategory, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCategory not found")
    return obj

@router.put("/exam-categories/{ec_id}", response_model=ExamCategoryOut)
async def update_exam_category(ec_id: int, body: ExamCategoryUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(ExamCategory, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCategory not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/exam-categories/{ec_id}", status_code=204)
async def delete_exam_category(ec_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(ExamCategory, ec_id)
    if not obj:
        raise HTTPException(404, "ExamCategory not found")
    await db.delete(obj)
    await db.commit()


# ── NoExamReasons ─────────────────────────────────────────────────────────────

@router.get("/no-exam-reasons", response_model=list[NoExamReasonOut])
async def list_no_exam_reasons(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(NoExamReason).order_by(NoExamReason.reason))
    return result.scalars().all()

@router.post("/no-exam-reasons", response_model=NoExamReasonOut, status_code=201)
async def create_no_exam_reason(body: NoExamReasonCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = NoExamReason(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/no-exam-reasons/{r_id}", response_model=NoExamReasonOut)
async def update_no_exam_reason(r_id: int, body: NoExamReasonUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(NoExamReason, r_id)
    if not obj:
        raise HTTPException(404, "NoExamReason not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/no-exam-reasons/{r_id}", status_code=204)
async def delete_no_exam_reason(r_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(NoExamReason, r_id)
    if not obj:
        raise HTTPException(404, "NoExamReason not found")
    await db.delete(obj)
    await db.commit()


# ── NoAdmitReasons ────────────────────────────────────────────────────────────

@router.get("/no-admit-reasons", response_model=list[NoAdmitReasonOut])
async def list_no_admit_reasons(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(NoAdmitReason).order_by(NoAdmitReason.reason))
    return result.scalars().all()

@router.post("/no-admit-reasons", response_model=NoAdmitReasonOut, status_code=201)
async def create_no_admit_reason(body: NoAdmitReasonCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = NoAdmitReason(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/no-admit-reasons/{r_id}", response_model=NoAdmitReasonOut)
async def update_no_admit_reason(r_id: int, body: NoAdmitReasonUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(NoAdmitReason, r_id)
    if not obj:
        raise HTTPException(404, "NoAdmitReason not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/no-admit-reasons/{r_id}", status_code=204)
async def delete_no_admit_reason(r_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(NoAdmitReason, r_id)
    if not obj:
        raise HTTPException(404, "NoAdmitReason not found")
    await db.delete(obj)
    await db.commit()


# ── Subjects ──────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Subject).order_by(Subject.name))
    return result.scalars().all()

@router.post("/subjects", response_model=SubjectOut, status_code=201)
async def create_subject(body: SubjectCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = Subject(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/subjects/{s_id}", response_model=SubjectOut)
async def get_subject(s_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Subject, s_id)
    if not obj:
        raise HTTPException(404, "Subject not found")
    return obj

@router.put("/subjects/{s_id}", response_model=SubjectOut)
async def update_subject(s_id: int, body: SubjectUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Subject, s_id)
    if not obj:
        raise HTTPException(404, "Subject not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/subjects/{s_id}", status_code=204)
async def delete_subject(s_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Subject, s_id)
    if not obj:
        raise HTTPException(404, "Subject not found")
    await db.delete(obj)
    await db.commit()


# ── SchoolTypes ───────────────────────────────────────────────────────────────

from app.models.lookups import SchoolType, ExamType
from app.schemas.lookups import (
    SchoolTypeCreate, SchoolTypeUpdate, SchoolTypeOut,
    ExamTypeCreate, ExamTypeUpdate, ExamTypeOut,
)

@router.get("/school-types", response_model=list[SchoolTypeOut])
async def list_school_types(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(SchoolType).order_by(SchoolType.name))
    return result.scalars().all()

@router.post("/school-types", response_model=SchoolTypeOut, status_code=201)
async def create_school_type(body: SchoolTypeCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = SchoolType(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/school-types/{st_id}", response_model=SchoolTypeOut)
async def get_school_type(st_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(SchoolType, st_id)
    if not obj:
        raise HTTPException(404, "SchoolType not found")
    return obj

@router.put("/school-types/{st_id}", response_model=SchoolTypeOut)
async def update_school_type(st_id: int, body: SchoolTypeUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(SchoolType, st_id)
    if not obj:
        raise HTTPException(404, "SchoolType not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/school-types/{st_id}", status_code=204)
async def delete_school_type(st_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(SchoolType, st_id)
    if not obj:
        raise HTTPException(404, "SchoolType not found")
    await db.delete(obj)
    await db.commit()


# ── ExamTypes ─────────────────────────────────────────────────────────────────

@router.get("/exam-types", response_model=list[ExamTypeOut])
async def list_exam_types(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(ExamType).options(selectinload(ExamType.school_types)).order_by(ExamType.name)
    )
    return result.scalars().all()

@router.post("/exam-types", response_model=ExamTypeOut, status_code=201)
async def create_exam_type(body: ExamTypeCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    data = body.model_dump()
    st_ids = data.pop("school_type_ids", [])
    obj = ExamType(**data)
    for st_id in st_ids:
        st = await db.get(SchoolType, st_id)
        if st:
            obj.school_types.append(st)
    db.add(obj)
    await db.commit()
    r = await db.execute(select(ExamType).where(ExamType.id == obj.id).options(selectinload(ExamType.school_types)))
    return r.scalar_one()

@router.get("/exam-types/{et_id}", response_model=ExamTypeOut)
async def get_exam_type(et_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(ExamType).where(ExamType.id == et_id).options(selectinload(ExamType.school_types)))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "ExamType not found")
    return obj

@router.put("/exam-types/{et_id}", response_model=ExamTypeOut)
async def update_exam_type(et_id: int, body: ExamTypeUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    r = await db.execute(select(ExamType).where(ExamType.id == et_id).options(selectinload(ExamType.school_types)))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "ExamType not found")
    data = body.model_dump(exclude_unset=True)
    st_ids = data.pop("school_type_ids", None)
    for k, v in data.items():
        setattr(obj, k, v)
    if st_ids is not None:
        obj.school_types = []
        for st_id in st_ids:
            st = await db.get(SchoolType, st_id)
            if st:
                obj.school_types.append(st)
    await db.commit()
    r2 = await db.execute(select(ExamType).where(ExamType.id == obj.id).options(selectinload(ExamType.school_types)))
    return r2.scalar_one()

@router.delete("/exam-types/{et_id}", status_code=204)
async def delete_exam_type(et_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(ExamType, et_id)
    if not obj:
        raise HTTPException(404, "ExamType not found")
    await db.delete(obj)
    await db.commit()

# ── ExamTypeSubjects (exam type → subjects matrix) ────────────────────────────
from sqlalchemy import text as _text

async def _load_exam_type_subjects(db: AsyncSession):
    """Return all exam types with their subjects as a flat structure the UI expects."""
    from app.schemas.lookups import SubjectRef
    rows = (await db.execute(
        _text("""
            SELECT et.id AS et_id, et.name AS et_name,
                   s.id  AS s_id,  s.name  AS s_name
            FROM exam_types et
            LEFT JOIN exam_type_subjects ets ON ets.exam_type_id = et.id
            LEFT JOIN subjects s ON s.id = ets.subject_id
            ORDER BY et.name, s.name
        """)
    )).fetchall()

    # Group by exam type
    from collections import OrderedDict
    grouped: dict = OrderedDict()
    for r in rows:
        if r.et_id not in grouped:
            grouped[r.et_id] = {"id": r.et_id, "name": r.et_name, "subjects": []}
        if r.s_id is not None:
            grouped[r.et_id]["subjects"].append({"id": r.s_id, "name": r.s_name})
    return list(grouped.values())


@router.get("/exam-type-subjects")
async def list_exam_type_subjects(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await _load_exam_type_subjects(db)


@router.put("/exam-type-subjects/{exam_type_id}")
async def set_exam_type_subjects(
    exam_type_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    """Replace all subjects for this exam type."""
    # Verify exam type exists
    et = await db.get(ExamType, exam_type_id)
    if not et:
        raise HTTPException(404, "ExamType not found")

    subject_ids: list[int] = body.get("subject_ids", [])

    # Delete existing, then insert new
    await db.execute(_text("DELETE FROM exam_type_subjects WHERE exam_type_id = :eid"), {"eid": exam_type_id})
    for sid in subject_ids:
        await db.execute(
            _text("INSERT INTO exam_type_subjects (exam_type_id, subject_id) VALUES (:eid, :sid) ON CONFLICT DO NOTHING"),
            {"eid": exam_type_id, "sid": sid},
        )
    await db.commit()

    result = await _load_exam_type_subjects(db)
    for item in result:
        if item["id"] == exam_type_id:
            return item
    return {"id": exam_type_id, "name": et.name, "subjects": []}
