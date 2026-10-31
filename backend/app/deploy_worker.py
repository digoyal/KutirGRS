"""Run in a separate systemd service, so restarting the API cannot kill deploy."""
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
from pathlib import Path
from app.deploy_state import now, read_job, state_dir, write_job

ROOT = Path(os.environ.get("PROJECT_ROOT", "/opt/sevakutir")).resolve()


def command(args, *, cwd=ROOT, env=None, capture=False):
    result = subprocess.run(args, cwd=cwd, env=env, check=True,
                            stdout=subprocess.PIPE if capture else None,
                            text=True, timeout=900)
    return result.stdout.strip() if capture else None


def archive(repo: Path, revision: str, destination: Path):
    destination.mkdir(parents=True)
    bundle = destination.parent / (destination.name + ".tar")
    command(["git", "archive", "--format=tar", "--output", str(bundle), revision], cwd=repo)
    with tarfile.open(bundle) as stream:
        stream.extractall(destination, filter="data")
    bundle.unlink()


def wait_healthy():
    for _ in range(30):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8001/health", timeout=2) as response:
                if json.load(response).get("status") == "ok":
                    return
        except (OSError, ValueError):
            pass
        time.sleep(2)
    raise RuntimeError("Service did not become healthy after restart")


def deploy(job: dict):
    directory = state_dir(ROOT)
    workspace = directory / "workspaces" / job["id"]
    old_commit = command(["git", "rev-parse", "HEAD"], capture=True)
    old_dist = directory / ("frontend-before-" + job["id"])
    old_venv = directory / ("venv-before-" + job["id"])
    live_venv = ROOT / "backend" / "venv"
    runtime = directory / "runtimes" / job["id"]
    stopped = switched = published = venv_switched = False
    try:
        print("[1/6] Fetching GitHub updates", flush=True)
        if command(["git", "status", "--porcelain", "--untracked-files=no"], capture=True):
            raise RuntimeError("Server has tracked edits; preserve them before deploying")
        command(["git", "fetch", "origin", "main"])
        target = command(["git", "rev-parse", "origin/main"], capture=True)
        command(["git", "merge-base", "--is-ancestor", old_commit, target])
        job.update(target_commit=target, previous_commit=old_commit)
        shared = ROOT.parent / "parivaar-ui"
        if not (shared / ".git").exists():
            raise RuntimeError("Missing sibling parivaar-ui checkout; see docs/deployment.md")
        if command(["git", "status", "--porcelain", "--untracked-files=no"], cwd=shared, capture=True):
            raise RuntimeError("Shared UI checkout has tracked edits")
        command(["git", "fetch", "origin", "main"], cwd=shared)
        command(["git", "merge", "--ff-only", "origin/main"], cwd=shared)
        job["ui_commit"] = command(["git", "rev-parse", "HEAD"], cwd=shared, capture=True)
        write_job(ROOT, job)
        archive(ROOT, target, workspace / "app")
        archive(shared, job["ui_commit"], workspace / "parivaar-ui")

        print("[2/6] Building frontend before changing the database", flush=True)
        frontend = workspace / "app" / "frontend"
        env = os.environ.copy()
        env.update(VITE_API_URL="/api/v1", GIT_TERMINAL_PROMPT="0")
        command(["npm", "ci", "--no-audit", "--no-fund"], cwd=frontend, env=env)
        # Source-only sibling resolves the app's React AND its type declarations.
        (workspace / "parivaar-ui" / "node_modules").symlink_to(frontend / "node_modules", target_is_directory=True)
        command(["npm", "run", "build"], cwd=frontend, env=env)
        # Install into a new immutable path: failures cannot damage live dependencies,
        # and console-script shebangs remain valid after linking it into backend/venv.
        command([sys.executable, "-m", "venv", str(runtime)])
        python = runtime / "bin" / "python"
        command([str(python), "-m", "pip", "install", "-r", str(workspace / "app" / "backend" / "requirements.txt"), "--quiet"])
        migration_env = env.copy()
        migration_env["PYTHONPATH"] = str(workspace / "app" / "backend")
        # `python -m` searches cwd before PYTHONPATH. Use the staged backend for
        # preview, but explicitly retain the LIVE database configuration.
        from app.config import settings
        migration_env["DATABASE_URL"] = settings.DATABASE_URL

        print("[3/6] Backing up the database", flush=True)
        from app.sql_migrations import _psql_env_and_args
        db_env, psql = _psql_env_and_args()
        backup = directory / "backups" / (job["id"] + ".dump")
        backup.parent.mkdir(mode=0o700, exist_ok=True)
        command([str(python), "-m", "app.sql_migrations", "--dry-run"], cwd=workspace / "app" / "backend", env=migration_env)
        stopped = True
        command(["sudo", "-n", "systemctl", "stop", "sevakutir"])
        with backup.open("xb") as stream:
            subprocess.run(["pg_dump", *psql[1:9], "--format=custom"], env=db_env,
                           stdout=stream, check=True, timeout=300)
        os.chmod(backup, 0o600)
        command(["pg_restore", "--list", str(backup)], capture=True)
        job["backup"] = backup.name
        write_job(ROOT, job)

        print("[4/6] Installing code and applying pending SQL migrations", flush=True)
        command(["git", "checkout", "--detach", target])
        switched = True
        live_venv.rename(old_venv)
        venv_switched = True
        live_venv.symlink_to(runtime, target_is_directory=True)
        command([str(python), "-m", "app.sql_migrations"], cwd=ROOT / "backend")

        print("[5/6] Publishing frontend", flush=True)
        dist = ROOT / "backend" / "frontend_dist"
        if dist.exists():
            dist.rename(old_dist)
        published = True
        shutil.copytree(frontend / "dist", dist)
        if (old_dist / "assets").exists():
            for item in (old_dist / "assets").iterdir():
                if item.is_file() and not (dist / "assets" / item.name).exists():
                    shutil.copy2(item, dist / "assets" / item.name)

        print("[6/6] Restarting and checking health", flush=True)
        command(["sudo", "-n", "systemctl", "start", "sevakutir"])
        wait_healthy()
        stopped = False
        print("Deployment succeeded: " + target[:12], flush=True)
    except BaseException:
        if switched or stopped:
            print("Restoring previous code/frontend. Database backup retained; applied migrations are NOT automatically reversed.", flush=True)
            if switched:
                command(["git", "checkout", "--detach", old_commit])
            if venv_switched:
                live_venv.unlink(missing_ok=True)
                old_venv.rename(live_venv)
            if published:
                shutil.rmtree(ROOT / "backend" / "frontend_dist", ignore_errors=True)
                if old_dist.exists():
                    old_dist.rename(ROOT / "backend" / "frontend_dist")
            command(["sudo", "-n", "systemctl", "restart", "sevakutir"])
        raise
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


def main():
    os.umask(0o077)
    directory = state_dir(ROOT)
    job = read_job(ROOT)
    if "--interrupted" in sys.argv:
        if job and job["state"] in {"queued", "running"}:
            job.pop("output", None)
            job.update(state="failed", success=False, returncode=1, finished_at=now())
            with (directory / (job["id"] + ".log")).open("a", encoding="utf-8") as log:
                log.write("\nDeployment worker interrupted. Backup retained; check the deployment log before retrying.\n")
            write_job(ROOT, job)
            (directory / "running.lock").unlink(missing_ok=True)
            subprocess.run(["sudo", "-n", "systemctl", "start", "sevakutir"], timeout=60)
        return 0
    if not job or job["state"] != "queued":
        return 1
    job.pop("output", None)
    with (directory / (job["id"] + ".log")).open("a", encoding="utf-8", buffering=1) as log:
        os.dup2(log.fileno(), 1)
        os.dup2(log.fileno(), 2)
        job["state"] = "running"
        write_job(ROOT, job)
        try:
            deploy(job)
            job.update(state="succeeded", success=True, returncode=0)
        except BaseException as error:
            print(f"Deploy failed: {type(error).__name__}: {error}", flush=True)
            job.update(state="failed", success=False, returncode=1)
        finally:
            job["finished_at"] = now()
            write_job(ROOT, job)
            (directory / "running.lock").unlink(missing_ok=True)
    return job["returncode"]


if __name__ == "__main__":
    sys.exit(main())
