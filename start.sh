#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then echo "Missing .env; copy .env.example and provide secrets." >&2; exit 1; fi
set -a
. ./.env
set +a
: "${JWT_SECRET:?JWT_SECRET is required}"
if [ "${#JWT_SECRET}" -lt 32 ]; then echo "JWT_SECRET must be at least 32 characters." >&2; exit 1; fi
if [ ! -d node_modules ] || [ ! -d frontend/node_modules ]; then echo "Dependencies missing; run ./scripts/bootstrap.sh explicitly." >&2; exit 1; fi

: "${BACKEND_PORT:?BACKEND_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "BACKEND_PORT and FRONTEND_PORT must differ." >&2; exit 1; }
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if command -v lsof >/dev/null && lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is in use; stop that process explicitly." >&2; exit 1; fi
done

PORT="$BACKEND_PORT" node backend/server.js &
BACKEND_PID=$!
(cd frontend && PORT="$FRONTEND_PORT" BROWSER=none npm start) &
FRONTEND_PID=$!
cleanup() { kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true; wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do sleep 1; done
echo "A managed service exited unexpectedly." >&2
exit 1
