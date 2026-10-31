"""Run: python -m pytest backend/tests/test_deploy.py (with backend on PYTHONPATH)."""
import asyncio
import subprocess
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from app import deploy_state, deploy_worker, sql_migrations
from app.auth import require_sysadmin
from app.routers import deploy


def completed(code=0, stdout="inactive"):
    return subprocess.CompletedProcess([], code, stdout, "")


def test_single_job_survives_reload_and_rejects_second_click(tmp_path):
    with patch.object(deploy_state.subprocess, "run", side_effect=[completed(), completed(0)]):
        queued = deploy_state.start_job(tmp_path)
    assert queued["state"] == "queued"
    saved = deploy_state.read_job(tmp_path)
    assert saved["id"] == queued["id"]
    with patch.object(deploy_state.subprocess, "run", return_value=completed()):
        with pytest.raises(FileExistsError):
            deploy_state.start_job(tmp_path)


def test_start_failure_is_visible_and_releases_lock(tmp_path):
    with patch.object(deploy_state.subprocess, "run", side_effect=[completed(), completed(1)]):
        with pytest.raises(RuntimeError):
            deploy_state.start_job(tmp_path)
    assert deploy_state.read_job(tmp_path)["state"] == "failed"
    assert not (tmp_path / ".deploy/running.lock").exists()


def test_busy_systemd_service_cannot_lose_a_new_job(tmp_path):
    with patch.object(deploy_state.subprocess, "run", return_value=completed(0, "activating")):
        with pytest.raises(FileExistsError):
            deploy_state.start_job(tmp_path)
    assert not (tmp_path / ".deploy/state.json").exists()


def test_logs_are_bounded_and_persisted(tmp_path):
    job = {"id": "a" * 32, "state": "running"}
    deploy_state.write_job(tmp_path, job)
    (tmp_path / ".deploy" / (job["id"] + ".log")).write_text("x" * 110000)
    assert len(deploy_state.read_job(tmp_path)["output"]) == 100000


def api_client(tmp_path):
    app = FastAPI()
    app.include_router(deploy.router)
    app.dependency_overrides[require_sysadmin] = lambda: Mock(title="SysAdmin")
    return app, TestClient(app)


def test_api_returns_accepted_and_status_after_reload(tmp_path):
    app, client = api_client(tmp_path)
    with patch.object(deploy, "PROJECT_ROOT", tmp_path), patch.object(deploy_state.subprocess, "run", side_effect=[completed(), completed()]):
        response = client.post("/admin/deploy")
    assert response.status_code == 202
    with patch.object(deploy, "PROJECT_ROOT", tmp_path), patch.object(deploy.subprocess, "run", return_value=completed(0, "abc Version")):
        status = client.get("/admin/deploy/status").json()
    assert status["job"]["id"] == response.json()["id"]


def test_api_conflict_and_setup_error(tmp_path):
    _, client = api_client(tmp_path)
    for error, expected in [(FileExistsError(), 409), (RuntimeError(), 503)]:
        with patch.object(deploy, "start_job", side_effect=error):
            assert client.post("/admin/deploy").status_code == expected


def test_both_endpoints_enforce_sysadmin(tmp_path):
    app, client = api_client(tmp_path)
    def denied():
        raise HTTPException(403, "SysAdmin access required")
    app.dependency_overrides[require_sysadmin] = denied
    assert client.post("/admin/deploy").status_code == 403
    assert client.get("/admin/deploy/status").status_code == 403


def test_migration_and_ledger_are_in_one_transaction(tmp_path):
    migration = tmp_path / "024_example.sql"
    migration.write_text("ALTER TABLE sample ADD COLUMN example text;")
    with patch.object(sql_migrations, "_psql_env_and_args", return_value=({}, ["psql"])), patch.object(sql_migrations.subprocess, "run", return_value=completed()) as run:
        sql_migrations._run_sql_file(migration)
    args = run.call_args.args[0]
    assert "--single-transaction" in args
    assert "-X" in args and "-w" in args
    assert "024_example.sql" in args[-1] and "schema_migrations" in args[-1]
    with patch.object(sql_migrations, "_psql_env_and_args", return_value=({}, ["psql"])), patch.object(sql_migrations.subprocess, "run", return_value=completed(1)):
        with pytest.raises(RuntimeError):
            sql_migrations._run_sql_file(migration)


def test_existing_database_never_silently_skips_new_sql():
    with patch.object(sql_migrations, "_ledger_exists", AsyncMock(return_value=False)), patch.object(sql_migrations, "_users_table_exists", AsyncMock(return_value=True)):
        with pytest.raises(RuntimeError, match="baseline"):
            asyncio.run(sql_migrations.ensure_ledger_and_pending(AsyncMock(), []))
        with pytest.raises(RuntimeError, match="baseline"):
            asyncio.run(sql_migrations._preview_pending(AsyncMock(), []))


def test_explicit_baseline_leaves_future_migrations_pending():
    scripts = [Path("022_old.sql"), Path("023_new.sql"), Path("024_future.sql")]
    engine = Mock()
    engine.begin.return_value.__aenter__ = AsyncMock(return_value=AsyncMock())
    engine.begin.return_value.__aexit__ = AsyncMock(return_value=False)
    engine.dispose = AsyncMock()
    with patch.object(sql_migrations, "list_numbered_scripts", return_value=scripts), patch.object(sql_migrations, "create_async_engine", return_value=engine), patch.object(sql_migrations, "_ledger_exists", AsyncMock(return_value=False)), patch.object(sql_migrations, "_create_ledger", AsyncMock()), patch.object(sql_migrations, "_seed_ledger", AsyncMock()) as seed:
        asyncio.run(sql_migrations.baseline_ledger(22))
    assert seed.call_args.args[1] == ["022_old.sql"]


def test_build_failure_never_stops_api_or_touches_database(tmp_path):
    root = tmp_path / "app"
    root.mkdir()
    shared = tmp_path / "parivaar-ui"
    (shared / ".git").mkdir(parents=True)
    calls = []
    def run(args, **kwargs):
        calls.append(args)
        if args[:2] == ["git", "status"]:
            return ""
        if args[:2] == ["git", "rev-parse"]:
            return "abc123"
        if args[:2] == ["npm", "ci"]:
            raise subprocess.CalledProcessError(1, args)
    with patch.object(deploy_worker, "ROOT", root), patch.object(deploy_worker, "command", side_effect=run), patch.object(deploy_worker, "archive"):
        with pytest.raises(subprocess.CalledProcessError):
            deploy_worker.deploy({"id": "test"})
    assert not any("systemctl" in args or "pg_dump" in args or "app.sql_migrations" in args for args in calls)
    assert not any(args[:2] == ["git", "checkout"] for args in calls)


def test_health_failure_is_not_reported_as_success():
    with patch.object(deploy_worker.urllib.request, "urlopen", side_effect=OSError), patch.object(deploy_worker.time, "sleep"):
        with pytest.raises(RuntimeError, match="healthy"):
            deploy_worker.wait_healthy()


@pytest.mark.parametrize("failure", [None, "backup", "migration", "health"])
def test_deployment_success_and_recovery(tmp_path, monkeypatch, failure):
    root = tmp_path / "app"
    (root / "backend/venv").mkdir(parents=True)
    (root / "backend/frontend_dist/assets").mkdir(parents=True)
    (root / "backend/frontend_dist/index.html").write_text("old frontend")
    (root / "backend/frontend_dist/assets/old.js").write_text("old asset")
    (tmp_path / "parivaar-ui/.git").mkdir(parents=True)
    calls = []
    preview_calls = []
    def run(args, **kwargs):
        calls.append(args)
        if args[-1] == "--dry-run":
            preview_calls.append((args, kwargs))
        if args[:2] == ["git", "status"]:
            return ""
        if args[:2] == ["git", "rev-parse"]:
            return "target" if args[-1] == "origin/main" else "previous"
        if args[:3] == ["npm", "run", "build"]:
            dist = kwargs["cwd"] / "dist"
            (dist / "assets").mkdir(parents=True)
            (dist / "index.html").write_text("new frontend")
        if args[-1] == "app.sql_migrations" and failure == "migration":
            raise subprocess.CalledProcessError(1, args)
    def unpack(repo, revision, destination):
        destination.mkdir(parents=True)
        if destination.name == "app":
            (destination / "frontend").mkdir()
    def pg_dump(args, **kwargs):
        assert args[0] == "pg_dump"
        if failure == "backup":
            raise subprocess.CalledProcessError(1, args)
        kwargs["stdout"].write(b"backup")
        return completed()
    monkeypatch.setattr(deploy_worker, "ROOT", root)
    monkeypatch.setattr(deploy_worker, "command", run)
    monkeypatch.setattr(deploy_worker, "archive", unpack)
    monkeypatch.setattr(deploy_worker.subprocess, "run", pg_dump)
    # Portable filesystem stand-ins: commands are simulated, no live service/DB used.
    monkeypatch.setattr(Path, "symlink_to", lambda self, *args, **kwargs: self.touch())
    monkeypatch.setattr(sql_migrations, "_psql_env_and_args", lambda: ({}, ["psql", "-h", "localhost", "-p", "5432", "-U", "app", "-d", "test"]))
    health = Mock(side_effect=RuntimeError("unhealthy") if failure == "health" else None)
    monkeypatch.setattr(deploy_worker, "wait_healthy", health)
    job = {"id": "test", "state": "running"}
    if failure:
        with pytest.raises((subprocess.CalledProcessError, RuntimeError)):
            deploy_worker.deploy(job)
        assert (root / "backend/frontend_dist/index.html").read_text() == "old frontend"
        assert (root / "backend/venv").is_dir()
        assert ["sudo", "-n", "systemctl", "restart", "sevakutir"] in calls
    else:
        deploy_worker.deploy(job)
        assert (root / "backend/frontend_dist/index.html").read_text() == "new frontend"
        assert (root / "backend/frontend_dist/assets/old.js").exists()
        assert job["target_commit"] == "target" and job["backup"] == "test.dump"
        health.assert_called_once()
        preview = next((args, kwargs) for args, kwargs in preview_calls)
        assert preview[1]["cwd"] == root / ".deploy/workspaces/test/app/backend"
        assert "DATABASE_URL" in preview[1]["env"]
    assert not (root / ".deploy/workspaces/test").exists()
