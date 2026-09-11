#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "→ Building frontend..."
cd frontend
npm run build
cd ..

echo "→ Copying dist to backend/frontend_dist..."
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist

echo "✓ Done. Restart the backend server to serve the updated frontend."
