from sqlalchemy import make_url
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Ensure we always use the asyncpg driver, even if DATABASE_URL was set in
# the shell environment without the +asyncpg suffix.
_url = make_url(settings.DATABASE_URL)
if _url.drivername in ("postgresql", "postgres"):
    _url = _url.set(drivername="postgresql+asyncpg")

engine = create_async_engine(
    _url,
    echo=settings.is_dev,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
