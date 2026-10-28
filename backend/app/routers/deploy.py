"""Short requests: systemd owns the job independently of the web service."""
import asyncio
import os
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_sysadmin
from app.deploy_state import read_job, start_job

router = APIRouter(prefix="/admin/deploy", tags=["deploy"])
PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", "/opt/sevakutir"))


@router.post("", status_code=202)
async def trigger_deploy(_=Depends(require_sysadmin)):
    try:
        return await asyncio.to_thread(start_job, PROJECT_ROOT)
    except FileExistsError:
        raise HTTPException(409, "A deployment is already running.")
    except (OSError, RuntimeError, subprocess.SubprocessError):
        raise HTTPException(503, "Cannot start deployment. Run the one-time deployment service setup in docs/deployment.md.")


@router.get("/status")
async def deploy_status(_=Depends(require_sysadmin)):
    def status():
        result = subprocess.run(["git", "log", "-1", "--format=%h %s"],
                                cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=10)
        return {"output": result.stdout.strip(), "success": result.returncode == 0,
                "job": read_job(PROJECT_ROOT)}
    try:
        return await asyncio.to_thread(status)
    except (OSError, subprocess.SubprocessError):
        raise HTTPException(503, "Deployment status is temporarily unavailable.")
