"""
Create the first admin user.

Usage (from backend/ directory):
    venv/bin/python scripts/seed_admin.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

USERNAME = "admin"
PASSWORD = "admin123"
EMAIL    = "admin@kutirgrs.local"
TITLE    = "Admin"

# Hardcode the URL so no shell env var can override it
DB_URL = "postgresql+asyncpg://postgres:namo1996@localhost:5432/kutirgrs_v2"

async def main():
    from sqlalchemy import make_url, select, text
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.orm import DeclarativeBase

    # Import models BEFORE creating engine so metadata is populated
    from app.database import Base
    import app.models.lookups  # noqa
    import app.models.geo      # noqa
    import app.models.users    # noqa
    import app.models.donors   # noqa
    import app.models.schools  # noqa
    import app.models.kutirs   # noqa
    import app.models.students  # noqa
    import app.models.visits    # noqa
    from app.models.users import User
    from app.auth import hash_password

    print(f"Connecting to: {DB_URL}")

    engine = create_async_engine(DB_URL, echo=True)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        existing = await session.execute(select(User).where(User.username == USERNAME))
        if existing.scalar_one_or_none():
            print(f"User '{USERNAME}' already exists — nothing to do.")
            await engine.dispose()
            return

        user = User(
            username=USERNAME,
            email=EMAIL,
            title=TITLE,
            password=hash_password(PASSWORD),
            is_active=True,
            is_superuser=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"✓ Admin user created: id={user.id} username={user.username}")

    await engine.dispose()

asyncio.run(main())
