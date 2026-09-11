"""
Exports geo data from the old parivaar_grs Django DB to geo_export.json
Run: venv/bin/python scripts/export_geo.py
"""
import asyncio, json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

OLD_DB = "postgresql+asyncpg://postgres:namo1996@localhost:5432/parivaar_grs"

async def main():
    engine = create_async_engine(OLD_DB, echo=False)
    async with engine.connect() as conn:
        zones = [dict(r._mapping) for r in (await conn.execute(text("SELECT id, name FROM grs_zone ORDER BY id"))).fetchall()]
        districts = [dict(r._mapping) for r in (await conn.execute(text("SELECT id, name, zone_id FROM grs_district ORDER BY id"))).fetchall()]
        areas = [dict(r._mapping) for r in (await conn.execute(text("SELECT id, name, district_id FROM grs_area ORDER BY id"))).fetchall()]
        clusters = [dict(r._mapping) for r in (await conn.execute(text("SELECT id, name, area_id FROM grs_cluster ORDER BY id"))).fetchall()]
    await engine.dispose()

    data = {"zones": zones, "districts": districts, "areas": areas, "clusters": clusters}
    with open("scripts/geo_export.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"✓ Exported: {len(zones)} zones, {len(districts)} districts, {len(areas)} areas, {len(clusters)} clusters → scripts/geo_export.json")

asyncio.run(main())
