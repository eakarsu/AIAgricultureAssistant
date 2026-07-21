#!/usr/bin/env bash
set -euo pipefail
: "${RESET_DATABASE:?Set RESET_DATABASE=1 explicitly}"
: "${SEED_DEMO_DATA:?Set SEED_DEMO_DATA=1 explicitly}"
if [ "$RESET_DATABASE" != 1 ] || [ "$SEED_DEMO_DATA" != 1 ]; then echo "Both destructive seed flags must equal 1." >&2; exit 1; fi
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
node backend/seed.js
