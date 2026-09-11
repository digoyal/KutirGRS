#!/bin/bash
# Run this from ~/Projects/kutirGRS-v2/backend/ on your Mac
set -e
cd "$(dirname "$0")"

# 1. Create the database if it doesn't exist
echo "→ Creating database kutirgrs_v2 (skips if already exists)..."
createdb -U postgres kutirgrs_v2 2>/dev/null && echo "  Created." || echo "  Already exists, continuing."

# 2. Create/recreate the venv using THIS machine's Python if needed
PYTHON=$(which python3)

if [ ! -f "venv/bin/python3" ] || ! venv/bin/python3 -c "import pydantic_settings, asyncpg, fastapi, greenlet, bcrypt" 2>/dev/null; then
  echo "→ Removing old venv..."
  rm -rf venv
  echo "→ Setting up Python venv with $($PYTHON --version)..."
  "$PYTHON" -m venv venv
  echo "→ Installing dependencies..."
  venv/bin/pip install asyncpg
  venv/bin/pip install -r requirements.txt
  echo "  Done."
fi

# 3. Verify key packages
echo "→ Verifying packages..."
venv/bin/python3 -c "
import fastapi, sqlalchemy, asyncpg, pydantic_settings, greenlet, bcrypt
print(f'  fastapi {fastapi.__version__}')
print(f'  sqlalchemy {sqlalchemy.__version__}')
print(f'  asyncpg {asyncpg.__version__}')
print(f'  bcrypt {bcrypt.__version__}')
"

# 4. Start the FastAPI server on port 8001
echo "→ Starting KutirGRS v2 API on http://localhost:8001 ..."
echo "  API docs: http://localhost:8001/docs"
venv/bin/uvicorn app.main:app --reload --port 8001
