"""
Create the first admin user.

Usage (from backend/ directory):
    venv/bin/python scripts/seed_admin.py

Requires in backend/.env (or the environment):
    DATABASE_URL   — async SQLAlchemy URL (postgresql+asyncpg://...)
    ADMIN_PASSWORD — plaintext password for the new admin user
Optional:
    ADMIN_USERNAME (default: admin)
    ADMIN_EMAIL    (default: admin@kutirgrs.local)
    ADMIN_TITLE    (default: Admin)
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required env var {name}. Set it in backend/.env or the environment.")
    return value


USERNAME = os.environ.get("ADMIN_USERNAME", "admin").strip() or "admin"
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@kutirgrs.local").strip() or "admin@kutirgrs.local"
TITLE = os.environ.get("ADMIN_TITLE", "Admin").strip() or "Admin"
PASSWORD = _require_env("ADMIN_PASSWORD")
DB_URL = _require_env("DATABASE_URL")


def _redacted_url(url: str) -> str:
    """Hide credentials when printing the DB URL."""
    try:
        from sqlalchemy import make_url

        u = make_url(url)
        return u.render_as_string(hide_password=True)
    except Exception:
        return "<DATABASE_URL>"


async def main():
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    from app.database import Base
    import app.models.lookups  # noqa
    import app.models.geo  # noqa
    import app.models.users  # noqa
    import app.models.donors  # noqa
    import app.models.schools  # noqa
    import app.models.kutirs  # noqa
    import app.models.students  # noqa
    import app.models.visits  # noqa
    from app.models.users import User
    from app.auth import hash_password

    print(f"Connecting to: {_redacted_url(DB_URL)}")

    engine = create_async_engine(DB_URL, echo=False)
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
