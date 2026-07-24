#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${RESET_DATABASE:?Set RESET_DATABASE=1 explicitly}"
: "${SEED_DEMO_DATA:?Set SEED_DEMO_DATA=1 explicitly}"
if [ "$RESET_DATABASE" != 1 ] || [ "$SEED_DEMO_DATA" != 1 ]; then echo "Both destructive seed flags must equal 1." >&2; exit 1; fi
node backend/seed.js
