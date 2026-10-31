# Deploy from the SysAdmin page

The button starts `sevakutir-deploy.service` and returns immediately. The page polls
saved progress, tolerates the API restarting, and recovers the last job after a reload.
Only SysAdmin can start jobs or read their logs. A lock rejects overlapping jobs.

Each job fetches GitHub main for KutirGRS and the sibling parivaar-ui checkout,
rejects tracked server edits/divergent Git history, and builds in an isolated workspace.
It forces `/api/v1` for the production frontend and resolves React/types from that
workspace, without using the old `/opt/sevakutir-next` dependency symlink.
Only after the build passes does it stop the API, back up the configured database,
check the dump's table of contents, apply pending numbered SQL, publish
the build, start the API, and check `/health`. Backend dependencies are prepared in a
separate virtual environment before stopping the API. `.env` and media are never replaced.

SQL is applied together with its ledger entry in one PostgreSQL transaction per
file. A failed file is rolled back and remains pending. Earlier successful files
remain applied. Never edit an applied SQL file; add a new `NNN_*.sql` migration.
Database changes **must** include numbered SQL; changing a model alone is insufficient.

## One-time installation on the existing Lightsail server

This installs a separate systemd worker and narrowly scoped noninteractive sudo
permissions. The web service cannot reliably restart itself in its own cgroup.
Root access is needed only for this installation, not for routine button clicks.
Merge this fix into GitHub main first. The existing service must run as a non-root
user with write access to `/opt/sevakutir`, its `.deploy` directory, and the sibling
`/opt/parivaar-ui` checkout. The database URL's user must be able to run pg_dump and
DDL on its own database. Node/npm, pg_dump, pg_restore and psql must be installed.

```bash
cd /opt/sevakutir
git fetch origin main
git merge --ff-only origin/main
sudo bash backend/scripts/install_deploy_service.sh
```

For this particular server, migrations 004–022 were already present/applied manually,
including 014 and 022 on 27 October 2026. With a verified backup, record ONLY that
known baseline (not new migrations from today's main):

```bash
cd /opt/sevakutir/backend
venv/bin/python -m app.sql_migrations --baseline-through 022
```

This only records the selected history. It does not run SQL. Migration 023 and later
stay pending. **023 drops the old `student_exams.form_received` column**, unused by
the new UI. Its data will be present in the next deployment's private database backup.
On a different database, determine its actual applied baseline instead of copying 022.
If a ledger already exists, inspect it before baselining; do not use `--sync-ledger`
to bypass pending migrations. That option is only for a fully restored database.

Build/install the updated page once, then restart:

```bash
cd /opt/sevakutir/frontend
npm ci
# On this server the sibling package may still point to yesterday's staging folder.
# Replace only that symlink, never an actual dependency directory:
if [ -L /opt/parivaar-ui/node_modules ]; then
  unlink /opt/parivaar-ui/node_modules
fi
if [ ! -e /opt/parivaar-ui/node_modules ]; then
  ln -s /opt/sevakutir/frontend/node_modules /opt/parivaar-ui/node_modules
fi
VITE_API_URL=/api/v1 npm run build &&
cp -a dist/. ../backend/frontend_dist/ &&
sudo systemctl restart sevakutir
```

Hard-refresh the Deploy page. Future updates use **Deploy Now** with no SSH session.
The button deploys main, so merge feature branches first.

## Failures and recovery

### Legacy users without email (migration 025)

The original 025 assumed every user already had email and failed on older live
databases. Its pending-upgrade SQL is corrected to create reset-token storage and
add a `NOT VALID` email check instead of failing on old rows. Migration 027 aligns
databases where the original 025 was already applied. Neither migration changes
user records or generates placeholder addresses. New inserts/updates require a
non-blank email; legacy list/detail/login reads accept a missing address. Password
reset cannot send a link until an administrator records that user's real email.
Do not mark a failed 025 as applied or use `--sync-ledger` to skip it. After merging
the correction into main, retry Deploy Now; the failed file remains pending and
will run again. The preview now reads the staged target's scripts against the live
database, rather than incorrectly reporting only the old checkout's pending SQL.

Backups, logs, and the saved job are private under `/opt/sevakutir/.deploy/` and
ignored by Git. Retain backups according to available disk space; no automatic
deletion is performed. Failed frontend builds do not stop the running site or run SQL.
After a later failure the worker attempts to restore the previous code/frontend and
restart. It does not automatically reverse migrations or restore the database:
that could overwrite newer records. The previous dependency environment is also restored.
The failed log remains available on the Deploy page. systemd's stop hook marks an
interrupted job failed, releases the lock, and starts the API if necessary.

For installation/permission failures, inspect `journalctl -u sevakutir-deploy`.
After a host power loss with a stale lock, confirm the worker is stopped before
removing `.deploy/running.lock`; never remove a lock for an active worker.

## Validation

Run backend deploy regression tests and `docs/smoke-test.md`. On a test server verify:
successful/no-op deployments; new SQL applied once; invalid SQL rolls back; failed
build leaves live code/database unchanged; duplicate clicks return 409; page reload
recovers logs; service restart reconnects; and a non-SysAdmin receives 403.
