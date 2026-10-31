"""
Students, StudentExams, StudentExamScores, StudentProgress
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy import select, delete, func, Integer, cast
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_scope, require_kutir_in_scope
from app.models.students import (
    Student, StudentExam, StudentExamScore, StudentProgress,
)
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area
from app.models.lookups import Subject
from app.schemas.students import (
    StudentCreate, StudentUpdate, StudentOut,
    StudentExamCreate, StudentExamUpdate, StudentExamOut, AdmissionFunnelOut,
    StudentProgressCreate, StudentProgressUpdate, StudentProgressOut,
    ExamScoreCreate,
)
import os, uuid, shutil
from app.config import settings
from app.admission_uniqueness import assert_admission_uniqueness, admission_duplicate_detail

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────
def _media(sub: str) -> str:
    path = os.path.join(settings.MEDIA_DIR, sub)
    os.makedirs(path, exist_ok=True)
    return path


async def _require_student_in_scope(
    db: AsyncSession,
    student_id: int,
    scope: Optional[set[int]],
    *,
    detail: str,
) -> Student:
    """Load student; 404 if missing or student's kutir is out of scope."""
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(404, detail)
    require_kutir_in_scope(student.kutir_id, scope, detail=detail)
    return student


# ════════════════════════════════════════════════════════════════════════════
# STUDENTS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/students", response_model=list[StudentOut], tags=["Students"])
async def list_students(
    response: Response,
    kutir_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    gender: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    name_only: Optional[bool] = Query(False),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    # ── Build base WHERE (shared by count + data queries) ──
    def _apply_filters(q):
        needs_geo = district_id is not None or cluster_id is not None
        if needs_geo:
            q = (q
                 .join(Kutir, Student.kutir_id == Kutir.id)
                 .join(Cluster, Kutir.cluster_id == Cluster.id)
                 .join(Area, Cluster.area_id == Area.id))
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id:
            q = q.where(Kutir.cluster_id == cluster_id)
        elif district_id:
            q = q.where(Area.district_id == district_id)
        if gender:
            q = q.where(Student.gender == gender)
        if search:
            term = f"%{search}%"
            if name_only:
                q = q.where(
                    (Student.first_name.ilike(term)) |
                    (Student.last_name.ilike(term))
                )
            else:
                q = q.where(
                    (Student.first_name.ilike(term)) |
                    (Student.last_name.ilike(term)) |
                    (Student.phone.ilike(term)) |
                    (Student.father_name.ilike(term))
                )
        return q

    # ── Total count (always) ──
    count_q = _apply_filters(select(func.count()).select_from(Student))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # ── Data ──
    data_q = _apply_filters(select(Student)).order_by(Student.last_name, Student.first_name)
    if not name_only:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    return result.scalars().all()


@router.post("/students", response_model=StudentOut, status_code=201, tags=["Students"])
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    require_kutir_in_scope(data.kutir_id, scope, detail="Student not found")
    student = Student(**data.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/students/{id}", response_model=StudentOut, tags=["Students"])
async def get_student(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="Student not found")
    return obj


@router.patch("/students/{id}", response_model=StudentOut, tags=["Students"])
async def update_student(
    id: int, data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="Student not found")
    update = data.model_dump(exclude_unset=True)
    if "kutir_id" in update:
        require_kutir_in_scope(update["kutir_id"], scope, detail="Student not found")
    for k, v in update.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/students/{id}", status_code=204, tags=["Students"])
async def delete_student(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="Student not found")
    await db.delete(obj)
    await db.commit()


@router.post("/students/{id}/photo", response_model=StudentOut, tags=["Students"])
async def upload_student_photo(
    id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    require_kutir_in_scope(obj.kutir_id, scope, detail="Student not found")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(_media("student_photos"), filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    obj.photo = f"student_photos/{filename}"
    await db.commit()
    await db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# STUDENT EXAMS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/student-exams", response_model=list[StudentExamOut], tags=["Student Exams"])
async def list_exams(
    response: Response,
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    school_start_year: Optional[int] = Query(None),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    admitted: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    def _apply_filters(q):
        needs_student = (
            scope is not None or kutir_id is not None or
            cluster_id is not None or district_id is not None or
            (search is not None and search.strip() != "")
        )
        if needs_student:
            q = q.join(Student, StudentExam.student_id == Student.id)
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id is not None or district_id is not None:
            q = (q.join(Kutir, Student.kutir_id == Kutir.id)
                  .join(Cluster, Kutir.cluster_id == Cluster.id)
                  .join(Area, Cluster.area_id == Area.id))
            if cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)
            elif district_id:
                q = q.where(Area.district_id == district_id)
        if student_id:
            q = q.where(StudentExam.student_id == student_id)
        if school_id:
            q = q.where(StudentExam.school_id == school_id)
        if school_start_year:
            q = q.where(StudentExam.school_start_year == school_start_year)
        if admitted is not None:
            q = q.where(StudentExam.admitted == admitted)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.where(
                (Student.first_name.ilike(term)) |
                (Student.last_name.ilike(term)) |
                (Student.phone.ilike(term)) |
                (Student.father_name.ilike(term))
            )
        return q

    count_q = _apply_filters(select(func.count()).select_from(StudentExam))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(
        select(StudentExam).options(selectinload(StudentExam.scores))
    ).order_by(StudentExam.school_start_year.desc())
    if student_id is None and admitted is not True:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    return result.scalars().all()


@router.get(
    "/student-exams/funnel",
    response_model=AdmissionFunnelOut,
    tags=["Student Exams"],
)
async def admission_funnel(
    school_start_year: int = Query(..., description="School start year to aggregate"),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    """Return pipeline stage counts in SQL (Eligible→…→Admitted). Respects get_scope."""
    q = select(
        func.count().label("total"),
        func.coalesce(func.sum(cast(StudentExam.eligible, Integer)), 0).label("eligible"),
        func.coalesce(func.sum(cast(StudentExam.applied, Integer)), 0).label("applied"),
        func.coalesce(func.sum(cast(StudentExam.admit_card, Integer)), 0).label("admit_card"),
        func.coalesce(func.sum(cast(StudentExam.appeared, Integer)), 0).label("appeared"),
        func.coalesce(func.sum(cast(StudentExam.selected, Integer)), 0).label("selected"),
        func.coalesce(func.sum(cast(StudentExam.admitted, Integer)), 0).label("admitted"),
    ).select_from(StudentExam)

    needs_student = (
        scope is not None
        or kutir_id is not None
        or cluster_id is not None
        or district_id is not None
    )
    if needs_student:
        q = q.join(Student, StudentExam.student_id == Student.id)
    if scope is not None:
        q = q.where(Student.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
    if cluster_id is not None or district_id is not None:
        q = (
            q.join(Kutir, Student.kutir_id == Kutir.id)
            .join(Cluster, Kutir.cluster_id == Cluster.id)
            .join(Area, Cluster.area_id == Area.id)
        )
        if cluster_id:
            q = q.where(Kutir.cluster_id == cluster_id)
        elif district_id:
            q = q.where(Area.district_id == district_id)

    q = q.where(StudentExam.school_start_year == school_start_year)
    row = (await db.execute(q)).one()
    return AdmissionFunnelOut(
        school_start_year=school_start_year,
        total=int(row.total),
        eligible=int(row.eligible),
        applied=int(row.applied),
        admit_card=int(row.admit_card),
        appeared=int(row.appeared),
        selected=int(row.selected),
        admitted=int(row.admitted),
    )


def _require_admission_class_when_admitted(admitted: bool, admission_class) -> None:
    """Class (5 or 8) is required whenever admitted is true — FE and Bulk Progress rely on it."""
    if not admitted:
        return
    if admission_class not in (5, 8):
        raise HTTPException(
            400,
            "Class is required when admitting (must be 5 or 8).",
        )


@router.post("/student-exams", response_model=StudentExamOut, status_code=201, tags=["Student Exams"])
async def create_exam(
    data: StudentExamCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    await _require_student_in_scope(db, data.student_id, scope, detail="StudentExam not found")
    scores = data.scores
    exam_data = data.model_dump(exclude={"scores"})
    if exam_data.get("admitted"):
        _require_admission_class_when_admitted(True, exam_data.get("admission_class"))

    await assert_admission_uniqueness(
        db,
        student_id=exam_data["student_id"],
        school_start_year=exam_data["school_start_year"],
        admitted=bool(exam_data.get("admitted")),
        exam_type_id=exam_data.get("exam_type_id"),
        school_id=exam_data.get("school_id"),
        admitted_school_id=exam_data.get("admitted_school_id"),
    )

    exam = StudentExam(**exam_data)
    db.add(exam)
    try:
        await db.flush()  # get exam.id
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, admission_duplicate_detail(exam_data["school_start_year"]))

    for s in scores:
        db.add(StudentExamScore(exam_id=exam.id, subject_id=s.subject_id, score=s.score))

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, admission_duplicate_detail(exam_data["school_start_year"]))
    await db.refresh(exam)
    return exam


@router.get("/student-exams/{id}", response_model=StudentExamOut, tags=["Student Exams"])
async def get_exam(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentExam not found")
    return obj


@router.patch("/student-exams/{id}", response_model=StudentExamOut, tags=["Student Exams"])
async def update_exam(
    id: int, data: StudentExamUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentExam not found")
    update = data.model_dump(exclude_unset=True)
    scores = update.pop("scores", None)

    final_admitted = update["admitted"] if "admitted" in update else obj.admitted
    final_class = update["admission_class"] if "admission_class" in update else obj.admission_class
    _require_admission_class_when_admitted(bool(final_admitted), final_class)

    final_exam_type = update["exam_type_id"] if "exam_type_id" in update else obj.exam_type_id
    final_admitted_school = (
        update["admitted_school_id"] if "admitted_school_id" in update else obj.admitted_school_id
    )

    await assert_admission_uniqueness(
        db,
        student_id=obj.student_id,
        school_start_year=obj.school_start_year,
        admitted=bool(final_admitted),
        exam_type_id=final_exam_type,
        school_id=obj.school_id,
        admitted_school_id=final_admitted_school,
        exclude_exam_id=id,
    )

    for k, v in update.items():
        setattr(obj, k, v)
    if scores is not None:
        # replace scores
        await db.execute(
            delete(StudentExamScore).where(StudentExamScore.exam_id == id)
        )
        for s in scores:
            db.add(StudentExamScore(exam_id=id, subject_id=s["subject_id"], score=s.get("score")))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, admission_duplicate_detail(obj.school_start_year))
    await db.refresh(obj)
    return obj


@router.delete("/student-exams/{id}", status_code=204, tags=["Student Exams"])
async def delete_exam(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentExam not found")
    await db.delete(obj)
    await db.commit()


# ════════════════════════════════════════════════════════════════════════════
# STUDENT PROGRESS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/student-progress", response_model=list[StudentProgressOut], tags=["Student Progress"])
async def list_progress(
    response: Response,
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    academic_year: Optional[int] = Query(None),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    admitted: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    def _apply_filters(q):
        needs_student = (
            scope is not None or kutir_id is not None or
            cluster_id is not None or district_id is not None or
            (search is not None and search.strip() != "")
        )
        if needs_student:
            q = q.join(Student, StudentProgress.student_id == Student.id)
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id is not None or district_id is not None:
            q = (q.join(Kutir, Student.kutir_id == Kutir.id)
                  .join(Cluster, Kutir.cluster_id == Cluster.id)
                  .join(Area, Cluster.area_id == Area.id))
            if cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)
            elif district_id:
                q = q.where(Area.district_id == district_id)
        if student_id:
            q = q.where(StudentProgress.student_id == student_id)
        if school_id:
            q = q.where(StudentProgress.school_id == school_id)
        if academic_year:
            q = q.where(StudentProgress.academic_year == academic_year)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.where(
                (Student.first_name.ilike(term)) |
                (Student.last_name.ilike(term)) |
                (Student.phone.ilike(term)) |
                (Student.father_name.ilike(term))
            )
        return q

    count_q = _apply_filters(select(func.count()).select_from(StudentProgress))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(select(StudentProgress)).order_by(StudentProgress.academic_year.desc())
    if student_id is None:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    return result.scalars().all()


@router.post("/student-progress", response_model=StudentProgressOut, status_code=201, tags=["Student Progress"])
async def create_progress(
    data: StudentProgressCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    await _require_student_in_scope(db, data.student_id, scope, detail="StudentProgress not found")
    obj = StudentProgress(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/student-progress/{id}", response_model=StudentProgressOut, tags=["Student Progress"])
async def get_progress(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentProgress not found")
    return obj


@router.patch("/student-progress/{id}", response_model=StudentProgressOut, tags=["Student Progress"])
async def update_progress(
    id: int, data: StudentProgressUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentProgress not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/student-progress/{id}", status_code=204, tags=["Student Progress"])
async def delete_progress(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    await _require_student_in_scope(db, obj.student_id, scope, detail="StudentProgress not found")
    await db.delete(obj)
    await db.commit()


