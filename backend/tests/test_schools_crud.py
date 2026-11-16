"""School create/update must eager-load district for SchoolOut (async SQLAlchemy)."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

import app.models.geo  # noqa: F401
import app.models.schools  # noqa: F401

from app.database import AsyncSessionLocal
from app.models.geo import District
from app.models.schools import GovtResidentialSchool
from app.schemas.schools import SchoolOut


@pytest.mark.asyncio
async def test_school_out_with_district_id_requires_eager_load():
    async with AsyncSessionLocal() as db:
        district_id = (
            await db.execute(select(District.id).where(District.name == "Dewas").limit(1))
        ).scalar_one()

        obj = GovtResidentialSchool(
            name="__pytest_school_district_load__",
            school_type="JNV",
            city="khategaon",
            district_id=district_id,
            state="Madhya Pradesh",
        )
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        school_id = obj.id

        try:
            loaded = (
                await db.execute(
                    select(GovtResidentialSchool)
                    .where(GovtResidentialSchool.id == school_id)
                    .options(selectinload(GovtResidentialSchool.district))
                )
            ).scalar_one()
            out = SchoolOut.model_validate(loaded)
            assert out.district_id == district_id
            assert out.district is not None
            assert out.district.name == "Dewas"
        finally:
            row = await db.get(GovtResidentialSchool, school_id)
            if row:
                await db.delete(row)
                await db.commit()