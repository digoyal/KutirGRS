"""Pre-checks and safe commit for geo hierarchy and kutir deletes."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geo import Area, Cluster, District, ExamCenter, Zone
from app.models.kutirs import Kutir
from app.models.schools import GovtResidentialSchool
from app.models.students import Student
from app.models.users import user_areas, user_clusters, user_districts, user_kutirs, user_zones
from app.models.visits import KutirVisit


async def _count(db: AsyncSession, stmt) -> int:
    n = await db.scalar(stmt)
    return int(n or 0)


async def _commit_delete(db: AsyncSession, obj: Any) -> None:
    await db.delete(obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            409,
            "Cannot delete: this record is still referenced by other data. "
            "Remove those references first.",
        )


def _plural(n: int, singular: str, plural_form: str | None = None) -> str:
    if n == 1:
        return singular
    return plural_form if plural_form is not None else f"{singular}s"


async def delete_zone_if_allowed(db: AsyncSession, zone: Zone) -> None:
    district_n = await _count(
        db,
        select(func.count()).select_from(District).where(District.zone_id == zone.id),
    )
    if district_n:
        d = _plural(district_n, "district")
        raise HTTPException(
            400,
            f"Cannot delete: this zone has {district_n} {d}. Delete all districts first.",
        )
    user_n = await _count(
        db,
        select(func.count()).select_from(user_zones).where(user_zones.c.zone_id == zone.id),
    )
    if user_n:
        u = _plural(user_n, "user")
        raise HTTPException(
            409,
            f"Cannot delete: this zone is assigned to {user_n} {u}. "
            "Remove those assignments first.",
        )
    await _commit_delete(db, zone)


async def delete_district_if_allowed(db: AsyncSession, district: District) -> None:
    area_n = await _count(
        db,
        select(func.count()).select_from(Area).where(Area.district_id == district.id),
    )
    if area_n:
        a = _plural(area_n, "area", "areas")
        raise HTTPException(
            400,
            f"Cannot delete: this district has {area_n} {a}. Delete all areas first.",
        )
    exam_n = await _count(
        db,
        select(func.count()).select_from(ExamCenter).where(ExamCenter.district_id == district.id),
    )
    if exam_n:
        e = _plural(exam_n, "exam center", "exam centers")
        raise HTTPException(
            409,
            f"Cannot delete: this district has {exam_n} {e}. Remove or reassign them first.",
        )
    school_n = await _count(
        db,
        select(func.count())
        .select_from(GovtResidentialSchool)
        .where(GovtResidentialSchool.district_id == district.id),
    )
    if school_n:
        s = _plural(school_n, "school")
        raise HTTPException(
            409,
            f"Cannot delete: this district has {school_n} {s}. Remove or reassign them first.",
        )
    kutir_n = await _count(
        db,
        select(func.count()).select_from(Kutir).where(Kutir.district_id == district.id),
    )
    if kutir_n:
        k = _plural(kutir_n, "kutir", "kutirs")
        raise HTTPException(
            409,
            f"Cannot delete: this district has {kutir_n} {k} linked to it. Remove or reassign them first.",
        )
    user_n = await _count(
        db,
        select(func.count()).select_from(user_districts).where(
            user_districts.c.district_id == district.id
        ),
    )
    if user_n:
        u = _plural(user_n, "user")
        raise HTTPException(
            409,
            f"Cannot delete: this district is assigned to {user_n} {u}. "
            "Remove those assignments first.",
        )
    await _commit_delete(db, district)


async def delete_area_if_allowed(db: AsyncSession, area: Area) -> None:
    cluster_n = await _count(
        db,
        select(func.count()).select_from(Cluster).where(Cluster.area_id == area.id),
    )
    if cluster_n:
        c = _plural(cluster_n, "cluster")
        raise HTTPException(
            400,
            f"Cannot delete: this area has {cluster_n} {c}. Delete all clusters first.",
        )
    user_n = await _count(
        db,
        select(func.count()).select_from(user_areas).where(user_areas.c.area_id == area.id),
    )
    if user_n:
        u = _plural(user_n, "user")
        raise HTTPException(
            409,
            f"Cannot delete: this area is assigned to {user_n} {u}. "
            "Remove those assignments first.",
        )
    await _commit_delete(db, area)


async def delete_cluster_if_allowed(db: AsyncSession, cluster: Cluster) -> None:
    kutir_n = await _count(
        db,
        select(func.count()).select_from(Kutir).where(Kutir.cluster_id == cluster.id),
    )
    if kutir_n:
        k = _plural(kutir_n, "kutir", "kutirs")
        raise HTTPException(
            409,
            f"Cannot delete: this cluster has {kutir_n} {k}. Remove or reassign them first.",
        )
    user_n = await _count(
        db,
        select(func.count()).select_from(user_clusters).where(
            user_clusters.c.cluster_id == cluster.id
        ),
    )
    if user_n:
        u = _plural(user_n, "user")
        raise HTTPException(
            409,
            f"Cannot delete: this cluster is assigned to {user_n} {u}. "
            "Remove those assignments first.",
        )
    await _commit_delete(db, cluster)


async def delete_kutir_if_allowed(db: AsyncSession, kutir: Kutir) -> None:
    student_n = await _count(
        db,
        select(func.count()).select_from(Student).where(Student.kutir_id == kutir.id),
    )
    if student_n:
        s = _plural(student_n, "student")
        raise HTTPException(
            409,
            f"Cannot delete: this kutir has {student_n} {s}. Reassign or remove them first.",
        )
    visit_n = await _count(
        db,
        select(func.count()).select_from(KutirVisit).where(KutirVisit.kutir_id == kutir.id),
    )
    if visit_n:
        v = _plural(visit_n, "visit")
        raise HTTPException(
            409,
            f"Cannot delete: this kutir has {visit_n} {v}. Remove those records first.",
        )
    user_n = await _count(
        db,
        select(func.count()).select_from(user_kutirs).where(user_kutirs.c.kutir_id == kutir.id),
    )
    if user_n:
        u = _plural(user_n, "user")
        raise HTTPException(
            409,
            f"Cannot delete: this kutir is assigned to {user_n} {u}. "
            "Remove those assignments first.",
        )
    await _commit_delete(db, kutir)
