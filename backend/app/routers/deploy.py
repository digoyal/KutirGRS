import asyncio
import subprocess
import os
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_admin

router = APIRouter(prefix="/admin/deploy", tags=["deploy"])

# Path to the project root on the server — adjust if needed
PROJECT_ROOT = os.environ.get("PROJECT_ROOT", "/opt/sevakutir")

DEPLOY_SCRIPT = """
set -e
cd {root}

echo "=== [1/5] Git pull ==="
git pull origin main

echo "=== [2/5] Backend: install dependencies ==="
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "=== [3/5] Backend: run migrations ==="
alembic upgrade head

echo "=== [4/5] Frontend: install & build ==="
cd frontend
npm ci --silent
npm run build

echo "=== [5/5] Restarting services ==="
sudo systemctl restart sevakutir || true

echo "=== Deploy complete ==="
""".format(root=PROJECT_ROOT)


@router.post("")
async def trigger_deploy(_=Depends(require_admin)):
    """Run git pull + build + restart. Streams output as text."""
    try:
        proc = await asyncio.create_subprocess_shell(
            DEPLOY_SCRIPT,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            shell=True,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        output = stdout.decode("utf-8", errors="replace")
        success = proc.returncode == 0
        return {"success": success, "output": output, "returncode": proc.returncode}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Deploy timed out after 5 minutes")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def deploy_status(_=Depends(require_admin)):
    """Check git status and current commit."""
    try:
        result = subprocess.run(
            f"cd {PROJECT_ROOT} && git log -1 --format='%h %s (%cr)' && git status --short",
            shell=True, capture_output=True, text=True, timeout=10
        )
        return {"output": result.stdout + result.stderr, "success": result.returncode == 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
