from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base

# Import all models so Base.metadata knows about them at startup
import app.models.lookups   # noqa
import app.models.geo       # noqa
import app.models.donors    # noqa
import app.models.schools   # noqa
import app.models.users     # noqa  — must come after geo/donors
import app.models.kutirs    # noqa  — must come after clusters/donors/users
import app.models.students  # noqa  — must come after kutirs/lookups
import app.models.visits    # noqa

from app.routers.auth import router as auth_router
from app.routers.geo import router as geo_router
from app.routers.lookups import router as lookups_router
from app.routers.users import router as users_router
from app.routers.donors import router as donors_router
from app.routers.schools import router as schools_router
from app.routers.kutirs import router as kutirs_router
from app.routers.students import router as students_router
from app.routers.visits import router as visits_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="KutirGRS API",
    description="Backend API for Parivaar Kutir GRS Admission Tracking",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(geo_router, prefix=PREFIX)
app.include_router(lookups_router, prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)
app.include_router(donors_router, prefix=PREFIX)
app.include_router(schools_router, prefix=PREFIX)
app.include_router(kutirs_router, prefix=PREFIX)
app.include_router(students_router, prefix=PREFIX)
app.include_router(visits_router, prefix=PREFIX)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": app.version}


# Serve uploaded media files (visit photos, etc.)
_MEDIA = Path(__file__).parent.parent / settings.MEDIA_DIR
_MEDIA.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=_MEDIA), name="media")


# Serve React frontend (populated after `npm run build`)
_DIST = Path(__file__).parent.parent / "frontend_dist"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        return FileResponse(_DIST / "index.html")
