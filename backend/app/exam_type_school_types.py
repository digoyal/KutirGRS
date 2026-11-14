"""School types allowed per exam type (exam_type_school_types junction)."""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def school_type_names_for_exam_type(
    db: AsyncSession,
    exam_type_id: int | None,
) -> frozenset[str]:
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