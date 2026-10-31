#!/usr/bin/env bash
# KutirGRS frontend: stop stale vite preview (or prior dev) on 5173, start Vite HMR dev in background.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
PORT=5173
LOG="$FRONTEND/.vite-dev.log"
PIDFILE="$FRONTEND/.vite-dev.pid"
TMUX_SESSION="kutir-vite-dev"

cd "$FRONTEND"

if [[ ! -d node_modules ]]; then
  echo "→ node_modules missing; run: cd frontend && npm install"
  exit 1
fi

stop_port() {
  local pids
  pids=$(lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -z "$pids" ]]; then
    return 0
  fi
  echo "→ Stopping process(es) on port ${PORT}..."
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    local cmd=""
    cmd=$(ps -p "$pid" -o args= 2>/dev/null || true)
    if [[ "$cmd" == *"vite preview"* ]]; then
      echo "  Killed stale vite preview (PID ${pid})"
    elif [[ "$cmd" == *"vite"* ]]; then
      echo "  Killed prior vite dev (PID ${pid})"
    else
      echo "  Killed PID ${pid} (${cmd})"
    fi
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"
  sleep 0.5
  pids=$(lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    while read -r pid; do
      [[ -z "$pid" ]] && continue
      kill -9 "$pid" 2>/dev/null || true
    done <<< "$pids"
  fi
}

stop_port

echo "→ Starting Vite dev (HMR) on http://localhost:${PORT} ..."
: >"$LOG"

if command -v tmux >/dev/null 2>&1; then
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux kill-session -t "$TMUX_SESSION"
  fi
  echo "  tmux session: ${TMUX_SESSION} · log: ${LOG}"
  tmux new-session -d -s "$TMUX_SESSION" -c "$FRONTEND" -- bash -lc "npm run dev >>\"$LOG\" 2>&1"
else
  echo "  detached · log: ${LOG}"
  # tmux unavailable: start Vite in a new session so it survives script exit (macOS agent shells / nohup alone is flaky).
  if command -v python3 >/dev/null 2>&1; then
    dev_pid=""
    dev_pid=$(
      python3 - "$FRONTEND" "$LOG" "$PORT" <<'PY'
import os
import subprocess
import sys

frontend, log, port = sys.argv[1], sys.argv[2], sys.argv[3]
vite = os.path.join(frontend, "node_modules", ".bin", "vite")
cmd = [vite, "--port", port, "--host"]
if os.uname().sysname == "Darwin" and os.path.isfile("/usr/bin/caffeinate"):
    cmd = ["/usr/bin/caffeinate", "-i", *cmd]
with open(log, "a") as out:
    proc = subprocess.Popen(
        cmd,
        cwd=frontend,
        stdout=out,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )
print(proc.pid)
PY
    )
    [[ -n "$dev_pid" ]] && echo "$dev_pid" >"$PIDFILE"
  else
    (
      cd "$FRONTEND"
      if [[ "$(uname -s)" == "Darwin" ]] && command -v caffeinate >/dev/null 2>&1; then
        nohup caffeinate -i npm run dev >>"$LOG" 2>&1 </dev/null &
      else
        nohup npm run dev >>"$LOG" 2>&1 </dev/null &
      fi
      disown 2>/dev/null || true
    )
  fi
fi

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/" 2>/dev/null | grep -qE '@vite/client|@react-refresh'; then
    dev_pid=""
    dev_pid=$(lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null | head -1 || true)
    [[ -n "$dev_pid" ]] && echo "$dev_pid" >"$PIDFILE"
    lan_ip=""
    lan_ip=$(ipconfig getifaddr en0 2>/dev/null || true)
    echo "✓ Vite dev server is up (HMR). Open http://localhost:${PORT}"
    if [[ -n "$lan_ip" ]]; then
      echo "  Phone (same Wi‑Fi): http://${lan_ip}:${PORT}"
    fi
    echo "  If this tab was open during vite preview, hard refresh once (Cmd+Shift+R)."
    if [[ -n "$dev_pid" ]]; then
      if command -v tmux >/dev/null 2>&1 && tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        echo "  Vite PID: ${dev_pid} (tmux: ${TMUX_SESSION})"
      else
        echo "  Vite PID: ${dev_pid}"
      fi
    fi
    exit 0
  fi
  sleep 0.5
done

echo "✗ Timed out waiting for Vite dev. Check ${LOG}"
exit 1
