"""
Students, StudentExams, StudentExamScores, StudentProgress
"""
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy import select, delete, func, Integer, cast, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_scope, require_kutir_in_scope
from app.models.students import (
    Student, StudentExam, StudentExamScore, StudentProgress,
)
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area, District
from app.models.lookups import Subject
from app.schemas.students import (
    StudentCreate, StudentUpdate, StudentOut,
    StudentExamCreate, StudentExamUpdate, StudentExamOut, AdmissionFunnelOut,
    AdmissionFunnelKutirRowOut, AdmissionFunnelEntityRowOut,
    StudentProgressCreate, StudentProgressUpdate, StudentProgressOut,
    ExamScoreCreate,
)
import os, uuid, shutil
from app.config import settings
from app.admission_uniqueness import assert_admission_uniqueness, admission_duplicate_detail
from app.db_integrity import raise_http_for_integrity
from app.student_validation import validate_student_write, student_merged_for_update
from app.admission_pipeline_validation import (
    validate_student_exam_write,
    validate_school_type_for_exam_type,
    student_exam_merged_for_update,
)
from app.progress_logic import (
    apply_graduated_status,
    apply_promoted_status,
    classes_for_track,
    ensure_progress_from_admitted_exam,
    snapshot_marks,
    sync_class_year_from_marks,
    infer_track_for_student,
    merge_progress_payload,
    validate_status_write,
    validate_marks_write,
)

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


async def _student_exam_count(db: AsyncSession, student_id: int) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(StudentExam)
            .where(StudentExam.student_id == student_id)
        )
    ).scalar_one()


async def _exam_count_by_student_ids(db: AsyncSession, student_ids: list[int]) -> dict[int, int]:
    if not student_ids:
        return {}
    rows = await db.execute(
        select(StudentExam.student_id, func.count())
        .where(StudentExam.student_id.in_(student_ids))
        .group_by(StudentExam.student_id)
    )
    return dict(rows.all())


def _student_out(student: Student, *, exam_count: int) -> StudentOut:
    return StudentOut.model_validate(student).model_copy(update={"exam_count": exam_count})


_STUDENT_DELETE_BLOCKED_MSG = (
    "Cannot delete this student while an admission record exists. "
    "Delete or change admissions first."
)


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
    exam_year: Optional[int] = Query(None),
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
        if exam_year is not None:
            q = q.where(Student.exam_year == exam_year)
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
    students = result.scalars().all()
    counts = await _exam_count_by_student_ids(db, [s.id for s in students])
    return [_student_out(s, exam_count=counts.get(s.id, 0)) for s in students]


@router.post("/students", response_model=StudentOut, status_code=201, tags=["Students"])
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    require_kutir_in_scope(data.kutir_id, scope, detail="Student not found")
    validate_student_write(data.model_dump())
    student = Student(**data.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return _student_out(student, exam_count=0)


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
    exam_count = await _student_exam_count(db, id)
    return _student_out(obj, exam_count=exam_count)


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
    validate_student_write(student_merged_for_update(obj, update))
    for k, v in update.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    exam_count = await _student_exam_count(db, id)
    return _student_out(obj, exam_count=exam_count)


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
    if await _student_exam_count(db, id) > 0:
        raise HTTPException(409, _STUDENT_DELETE_BLOCKED_MSG)
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
    area_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
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
        func.coalesce(func.sum(cast(StudentExam.result_declared, Integer)), 0).label("result_declared"),
        func.coalesce(func.sum(cast(StudentExam.selected, Integer)), 0).label("selected"),
        func.coalesce(func.sum(cast(StudentExam.admitted, Integer)), 0).label("admitted"),
    ).select_from(StudentExam)

    geo_filter = any(
        v is not None for v in (kutir_id, cluster_id, area_id, district_id, zone_id)
    )
    needs_student = scope is not None or geo_filter
    if needs_student:
        q = q.join(Student, StudentExam.student_id == Student.id)
    if scope is not None:
        q = q.where(Student.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
    elif geo_filter:
        q = q.join(Kutir, Student.kutir_id == Kutir.id)
        if cluster_id is not None or area_id is not None or district_id is not None or zone_id is not None:
            q = (
                q.join(Cluster, Kutir.cluster_id == Cluster.id)
                .join(Area, Cluster.area_id == Area.id)
            )
            if district_id is not None or zone_id is not None:
                q = q.join(District, Area.district_id == District.id)
                if zone_id:
                    q = q.where(District.zone_id == zone_id)
                elif district_id:
                    q = q.where(Area.district_id == district_id)
            elif area_id:
                q = q.where(Cluster.area_id == area_id)
            elif cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)

    q = q.where(StudentExam.school_start_year == school_start_year)
    row = (await db.execute(q)).one()
    return AdmissionFunnelOut(
        school_start_year=school_start_year,
        registered=0,
        total=int(row.total),
        eligible=int(row.eligible),
        applied=int(row.applied),
        admit_card=int(row.admit_card),
        appeared=int(row.appeared),
        result_declared=int(row.result_declared),
        selected=int(row.selected),
        admitted=int(row.admitted),
    )


def _funnel_stage_aggs():
    return (
        func.count().label("total"),
        func.coalesce(func.sum(cast(StudentExam.eligible, Integer)), 0).label("eligible"),
        func.coalesce(func.sum(cast(StudentExam.applied, Integer)), 0).label("applied"),
        func.coalesce(func.sum(cast(StudentExam.admit_card, Integer)), 0).label("admit_card"),
        func.coalesce(func.sum(cast(StudentExam.appeared, Integer)), 0).label("appeared"),
        func.coalesce(func.sum(cast(StudentExam.result_declared, Integer)), 0).label("result_declared"),
        func.coalesce(func.sum(cast(StudentExam.selected, Integer)), 0).label("selected"),
        func.coalesce(func.sum(cast(StudentExam.admitted, Integer)), 0).label("admitted"),
    )


@router.get(
    "/student-exams/funnel-by-kutir",
    response_model=list[AdmissionFunnelKutirRowOut],
    tags=["Student Exams"],
)
async def admission_funnel_by_kutir(
    school_start_year: int = Query(..., description="School start year to aggregate"),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    """Per-kutir pipeline stage counts for the admission funnel report."""
    q = select(Kutir.id.label("kutir_id"), Kutir.name.label("kutir_name"), *_funnel_stage_aggs()).select_from(
        StudentExam
    )
    q = q.join(Student, StudentExam.student_id == Student.id)
    q = q.join(Kutir, Student.kutir_id == Kutir.id)
    if scope is not None:
        q = q.where(Student.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
    else:
        geo_filter = any(
            v is not None for v in (cluster_id, area_id, district_id, zone_id)
        )
        if geo_filter:
            q = (
                q.join(Cluster, Kutir.cluster_id == Cluster.id)
                .join(Area, Cluster.area_id == Area.id)
            )
            if district_id is not None or zone_id is not None:
                q = q.join(District, Area.district_id == District.id)
                if zone_id:
                    q = q.where(District.zone_id == zone_id)
                elif district_id:
                    q = q.where(Area.district_id == district_id)
            elif area_id:
                q = q.where(Cluster.area_id == area_id)
            elif cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)
    q = q.where(StudentExam.school_start_year == school_start_year)
    q = q.group_by(Kutir.id, Kutir.name)
    eligible_sum = func.coalesce(func.sum(cast(StudentExam.eligible, Integer)), 0)
    admitted_sum = func.coalesce(func.sum(cast(StudentExam.admitted, Integer)), 0)
    selected_sum = func.coalesce(func.sum(cast(StudentExam.selected, Integer)), 0)
    q = q.having(eligible_sum > 0)
    q = q.order_by(admitted_sum.desc(), selected_sum.desc(), eligible_sum.desc(), Kutir.name)
    rows = (await db.execute(q)).all()
    return [
        AdmissionFunnelKutirRowOut(
            school_start_year=school_start_year,
            registered=0,
            kutir_id=int(r.kutir_id),
            kutir_name=r.kutir_name,
            total=int(r.total),
            eligible=int(r.eligible),
            applied=int(r.applied),
            admit_card=int(r.admit_card),
            appeared=int(r.appeared),
            result_declared=int(r.result_declared),
            selected=int(r.selected),
            admitted=int(r.admitted),
        )
        for r in rows
    ]


_FUNNEL_ROW_LEVEL: dict[str, str] = {
    "zone": "district",
    "district": "area",
    "area": "cluster",
    "cluster": "kutir",
    "kutir": "kutir",
}


def _apply_funnel_geo_filters(
    q,
    *,
    kutir_id: Optional[int],
    cluster_id: Optional[int],
    area_id: Optional[int],
    district_id: Optional[int],
    zone_id: Optional[int],
    scope: Optional[set[int]],
):
    q = q.join(Student, StudentExam.student_id == Student.id)
    q = q.join(Kutir, Student.kutir_id == Kutir.id)
    if scope is not None:
        q = q.where(Student.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
        return q
    geo_filter = any(v is not None for v in (cluster_id, area_id, district_id, zone_id))
    if not geo_filter:
        return q
    q = (
        q.join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
    )
    if district_id is not None or zone_id is not None:
        q = q.join(District, Area.district_id == District.id)
        if zone_id is not None:
            q = q.where(District.zone_id == zone_id)
        elif district_id is not None:
            q = q.where(Area.district_id == district_id)
    elif area_id is not None:
        q = q.where(Cluster.area_id == area_id)
    elif cluster_id is not None:
        q = q.where(Kutir.cluster_id == cluster_id)
    return q


def _apply_student_geo_filters(
    q,
    *,
    kutir_id: Optional[int],
    cluster_id: Optional[int],
    area_id: Optional[int],
    district_id: Optional[int],
    zone_id: Optional[int],
    scope: Optional[set[int]],
):
    q = q.join(Kutir, Student.kutir_id == Kutir.id)
    if scope is not None:
        q = q.where(Student.kutir_id.in_(scope))
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
        return q
    geo_filter = any(v is not None for v in (cluster_id, area_id, district_id, zone_id))
    if not geo_filter:
        return q
    q = (
        q.join(Cluster, Kutir.cluster_id == Cluster.id)
        .join(Area, Cluster.area_id == Area.id)
    )
    if district_id is not None or zone_id is not None:
        q = q.join(District, Area.district_id == District.id)
        if zone_id is not None:
            q = q.where(District.zone_id == zone_id)
        elif district_id is not None:
            q = q.where(Area.district_id == district_id)
    elif area_id is not None:
        q = q.where(Cluster.area_id == area_id)
    elif cluster_id is not None:
        q = q.where(Kutir.cluster_id == cluster_id)
    return q


async def _registered_counts_by_entity(
    db: AsyncSession,
    *,
    school_start_year: int,
    row_level: str,
    id_col,
    name_col,
    kutir_id: Optional[int],
    cluster_id: Optional[int],
    area_id: Optional[int],
    district_id: Optional[int],
    zone_id: Optional[int],
    scope: Optional[set[int]],
    admission_class: Optional[int],
) -> dict[int, int]:
    """Distinct students with exam_year = school year, grouped by child geo entity."""
    q = select(
        id_col.label("entity_id"),
        func.count(func.distinct(Student.id)).label("registered"),
    ).select_from(Student)
    q = _apply_student_geo_filters(
        q,
        kutir_id=kutir_id,
        cluster_id=cluster_id,
        area_id=area_id,
        district_id=district_id,
        zone_id=zone_id,
        scope=scope,
    )
    if row_level == "district" and zone_id is None and district_id is None:
        q = q.join(District, Area.district_id == District.id)
    q = q.where(Student.exam_year == school_start_year)
    if admission_class is not None:
        exam_match = (
            select(StudentExam.student_id)
            .where(
                StudentExam.student_id == Student.id,
                StudentExam.school_start_year == school_start_year,
                StudentExam.admission_class == admission_class,
            )
            .correlate(Student)
            .exists()
        )
        q = q.where(exam_match)
    q = q.group_by(id_col)
    rows = (await db.execute(q)).all()
    return {int(r.entity_id): int(r.registered) for r in rows}


@router.get(
    "/student-exams/funnel-by-entity",
    response_model=list[AdmissionFunnelEntityRowOut],
    tags=["Student Exams"],
)
async def admission_funnel_by_entity(
    school_start_year: int = Query(..., description="School start year to aggregate"),
    entity_level: Literal["zone", "district", "area", "cluster", "kutir"] = Query(
        ...,
        description="Report entity level; table rows are the child geo level",
    ),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
    admission_class: Optional[int] = Query(
        None,
        description="When 5 or 8, filter exam stages and registered to that admission class",
    ),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    """Pipeline stage counts grouped by the child geo entity for the selected report level."""
    if admission_class is not None and admission_class not in (5, 8):
        raise HTTPException(400, "admission_class must be 5, 8, or omitted")
    leaf_id = {
        "zone": zone_id,
        "district": district_id,
        "area": area_id,
        "cluster": cluster_id,
        "kutir": kutir_id,
    }[entity_level]
    if leaf_id is None:
        raise HTTPException(
            400,
            f"Select a {entity_level} (pass {entity_level}_id) when entity_level is {entity_level}.",
        )
    row_level = _FUNNEL_ROW_LEVEL[entity_level]
    id_col, name_col = {
        "district": (District.id, District.name),
        "area": (Area.id, Area.name),
        "cluster": (Cluster.id, Cluster.name),
        "kutir": (Kutir.id, Kutir.name),
    }[row_level]

    q = select(id_col.label("entity_id"), name_col.label("entity_name"), *_funnel_stage_aggs()).select_from(
        StudentExam
    )
    q = _apply_funnel_geo_filters(
        q,
        kutir_id=kutir_id,
        cluster_id=cluster_id,
        area_id=area_id,
        district_id=district_id,
        zone_id=zone_id,
        scope=scope,
    )
    if row_level == "district" and zone_id is None and district_id is None:
        q = q.join(District, Area.district_id == District.id)
    q = q.where(StudentExam.school_start_year == school_start_year)
    if admission_class is not None:
        q = q.where(StudentExam.admission_class == admission_class)
    q = q.group_by(id_col, name_col)
    eligible_sum = func.coalesce(func.sum(cast(StudentExam.eligible, Integer)), 0)
    admitted_sum = func.coalesce(func.sum(cast(StudentExam.admitted, Integer)), 0)
    selected_sum = func.coalesce(func.sum(cast(StudentExam.selected, Integer)), 0)
    q = q.having(eligible_sum > 0)
    q = q.order_by(admitted_sum.desc(), selected_sum.desc(), eligible_sum.desc(), name_col)
    rows = (await db.execute(q)).all()
    registered_by_entity = await _registered_counts_by_entity(
        db,
        school_start_year=school_start_year,
        row_level=row_level,
        id_col=id_col,
        name_col=name_col,
        kutir_id=kutir_id,
        cluster_id=cluster_id,
        area_id=area_id,
        district_id=district_id,
        zone_id=zone_id,
        scope=scope,
        admission_class=admission_class,
    )
    return [
        AdmissionFunnelEntityRowOut(
            school_start_year=school_start_year,
            entity_id=int(r.entity_id),
            entity_name=r.entity_name,
            row_level=row_level,
            registered=registered_by_entity.get(int(r.entity_id), 0),
            total=int(r.total),
            eligible=int(r.eligible),
            applied=int(r.applied),
            admit_card=int(r.admit_card),
            appeared=int(r.appeared),
            result_declared=int(r.result_declared),
            selected=int(r.selected),
            admitted=int(r.admitted),
        )
        for r in rows
    ]


def _require_admission_class_when_admitted(admitted: bool, admission_class) -> None:
    """Class (5 or 8) is required whenever admitted is true — FE and Bulk Progress rely on it."""
    if not admitted:
        return
    if admission_class not in (5, 8):
        raise HTTPException(
            400,
            "Class is required when admitting (must be 5 or 8).",
        )


async def _subject_ids_for_exam_type(db: AsyncSession, exam_type_id: int | None) -> list[int]:
    if not exam_type_id:
        return []
    rows = await db.execute(
        text("SELECT subject_id FROM exam_type_subjects WHERE exam_type_id = :eid ORDER BY subject_id"),
        {"eid": exam_type_id},
    )
    return [int(r[0]) for r in rows]


async def _school_type_names_for_exam_type(db: AsyncSession, exam_type_id: int | None) -> frozenset[str]:
    if not exam_type_id:
        return frozenset()
    rows = await db.execute(
        text(
            "SELECT st.name FROM school_types st "
            "JOIN exam_type_school_types j ON j.school_type_id = st.id "
            "WHERE j.exam_type_id = :eid"
        ),
        {"eid": exam_type_id},
    )
    return frozenset(r[0] for r in rows)


def _scores_by_subject_from_payload(scores: list) -> dict[int, float | None]:
    out: dict[int, float | None] = {}
    for s in scores:
        if isinstance(s, dict):
            sid = s.get("subject_id")
            out[int(sid)] = s.get("score")
        else:
            out[int(s.subject_id)] = s.score
    return out


async def _scores_by_subject_for_exam(db: AsyncSession, exam_id: int) -> dict[int, float | None]:
    rows = (
        await db.execute(
            select(StudentExamScore.subject_id, StudentExamScore.score).where(
                StudentExamScore.exam_id == exam_id
            )
        )
    ).all()
    return {int(sid): score for sid, score in rows}


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

    subject_ids = await _subject_ids_for_exam_type(db, exam_data.get("exam_type_id"))
    validate_student_exam_write(
        exam_data,
        is_create=True,
        subject_ids=subject_ids,
        scores_by_subject=_scores_by_subject_from_payload(scores),
    )
    allowed_school_types = await _school_type_names_for_exam_type(db, exam_data.get("exam_type_id"))
    validate_school_type_for_exam_type(exam_data, allowed_school_type_names=allowed_school_types)

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
    except IntegrityError as e:
        await db.rollback()
        raise_http_for_integrity(e, school_start_year=exam_data["school_start_year"])

    for s in scores:
        db.add(StudentExamScore(exam_id=exam.id, subject_id=s.subject_id, score=s.score))

    if exam.admitted:
        await ensure_progress_from_admitted_exam(db, exam)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise_http_for_integrity(e, school_start_year=exam_data["school_start_year"])
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

    merged = student_exam_merged_for_update(obj, update)

    final_admitted = update["admitted"] if "admitted" in update else obj.admitted
    final_class = update["admission_class"] if "admission_class" in update else obj.admission_class
    _require_admission_class_when_admitted(bool(final_admitted), final_class)

    final_exam_type = merged.get("exam_type_id")
    if scores is not None:
        scores_map = _scores_by_subject_from_payload(scores)
    else:
        scores_map = await _scores_by_subject_for_exam(db, id)
    subject_ids = await _subject_ids_for_exam_type(db, final_exam_type)
    validate_student_exam_write(
        merged,
        is_create=False,
        subject_ids=subject_ids,
        scores_by_subject=scores_map,
    )
    allowed_school_types = await _school_type_names_for_exam_type(db, final_exam_type)
    validate_school_type_for_exam_type(merged, allowed_school_type_names=allowed_school_types)

    final_exam_type = merged.get("exam_type_id")
    final_admitted_school = merged.get("admitted_school_id")

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
    if final_admitted:
        await ensure_progress_from_admitted_exam(db, obj)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise_http_for_integrity(e, school_start_year=obj.school_start_year)
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
    payload = data.model_dump()
    if not payload.get("track"):
        payload["track"] = await infer_track_for_student(db, data.student_id)
    obj = StudentProgress(**payload)
    validate_marks_write(obj, payload)
    obj.status = validate_status_write(obj, obj.status, payload)
    marks_before = {c: None for c in classes_for_track(obj.track)}
    sync_class_year_from_marks(obj, marks_before)
    apply_promoted_status(obj)
    apply_graduated_status(obj)
    db.add(obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "This student already has a progress record.")
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
    marks_before = snapshot_marks(obj)
    update = merge_progress_payload(obj, data.model_dump(exclude_unset=True))
    for k, v in update.items():
        setattr(obj, k, v)
    sync_class_year_from_marks(obj, marks_before)
    apply_promoted_status(obj)
    apply_graduated_status(obj)
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


