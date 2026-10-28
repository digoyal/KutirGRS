"""Private persistent state shared by the API and systemd worker."""
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

ACTIVE = {"queued", "running"}


def now():
    return datetime.now(timezone.utc).isoformat()


def state_dir(root: Path) -> Path:
    directory = root / ".deploy"
    directory.mkdir(mode=0o700, exist_ok=True)
    return directory


def write_job(root: Path, job: dict):
    directory = state_dir(root)
    temporary = directory / ("state-" + uuid4().hex + ".tmp")
    with temporary.open("x", encoding="utf-8") as stream:
        os.chmod(temporary, 0o600)
        json.dump(job, stream)
    os.replace(temporary, directory / "state.json")


def read_job(root: Path) -> dict | None:
    directory = state_dir(root)
    try:
        job = json.loads((directory / "state.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    log = directory / (job["id"] + ".log")
    if log.exists():
        with log.open("rb") as stream:
            stream.seek(max(0, log.stat().st_size - 100_000))
            job["output"] = stream.read().decode("utf-8", errors="replace")
    else:
        job["output"] = ("Deployment worker could not start. Complete the one-time deployment service setup."
                         if job["state"] == "failed" else "Waiting for deployment worker…")
    return job


def start_job(root: Path) -> dict:
    directory = state_dir(root)
    service = subprocess.run(["systemctl", "is-active", "sevakutir-deploy.service"],
                             capture_output=True, text=True, timeout=10)
    if service.stdout.strip() in {"active", "activating", "deactivating"}:
        raise FileExistsError("Deployment service is busy")
    lock = directory / "running.lock"
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    job = {"id": uuid4().hex, "state": "queued", "started_at": now(),
           "finished_at": None, "success": None, "returncode": None}
    try:
        write_job(root, job)
        result = subprocess.run(
            ["sudo", "-n", "systemctl", "start", "--no-block", "sevakutir-deploy.service"],
            capture_output=True, text=True, timeout=10)
        if result.returncode:
            raise RuntimeError("Deployment service is not installed or permitted")
    except BaseException:
        job.update(state="failed", success=False, returncode=1, finished_at=now())
        write_job(root, job)
        lock.unlink(missing_ok=True)
        raise
    return job
