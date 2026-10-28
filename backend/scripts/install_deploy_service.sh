#!/usr/bin/env bash
# One-time server setup. Subsequent deployments run from the SysAdmin button.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then
  echo 'Run with sudo bash backend/scripts/install_deploy_service.sh'
  exit 1
fi
root=/opt/sevakutir
run_user=$(systemctl show sevakutir -p User --value)
if [[ -z "$run_user" || "$run_user" == root || ! "$run_user" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
  echo 'sevakutir must run as a named non-root user; configure its User= first.'
  exit 1
fi
node=$(sudo -H -u "$run_user" bash -lc 'if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi; command -v node')
node_dir=$(dirname "$node")
test -x "$node_dir/npm"
test -x "$root/backend/venv/bin/python"
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
systemctl_bin=$(command -v systemctl)
group=$(id -gn "$run_user")
install -d -m 700 -o "$run_user" -g "$group" "$root/.deploy"

cat > /etc/systemd/system/sevakutir-deploy.service <<EOF
[Unit]
Description=Sevakutir deployment worker
After=network-online.target postgresql.service

[Service]
Type=oneshot
User=$run_user
Group=$group
WorkingDirectory=$root/backend
Environment="PROJECT_ROOT=$root"
Environment="PATH=$node_dir:/usr/local/bin:/usr/bin:/bin"
Environment=PYTHONUNBUFFERED=1
Environment=GIT_TERMINAL_PROMPT=0
UMask=0077
ExecStart=$root/backend/venv/bin/python -m app.deploy_worker
ExecStopPost=$root/backend/venv/bin/python -m app.deploy_worker --interrupted
TimeoutStartSec=30min
TimeoutStopSec=30
KillMode=control-group
EOF

sudoers=$(mktemp)
trap 'rm -f "$sudoers"' EXIT
cat > "$sudoers" <<EOF
$run_user ALL=(root) NOPASSWD: $systemctl_bin start --no-block sevakutir-deploy.service
$run_user ALL=(root) NOPASSWD: $systemctl_bin stop sevakutir, $systemctl_bin start sevakutir, $systemctl_bin restart sevakutir
EOF
visudo -cf "$sudoers"
install -m 440 -o root -g root "$sudoers" /etc/sudoers.d/sevakutir-deploy
systemctl daemon-reload
echo 'Deployment service installed. Follow docs/deployment.md to baseline the legacy database and install the updated frontend once.'
