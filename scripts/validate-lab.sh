#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

echo "============================================================"
echo "[ICARE] Full lab validation"
echo "============================================================"

test -f .doctrine/lab.manifest.json
test -f .doctrine/capabilities.json
test -f .doctrine/golden-paths/beui2-runtime-network.golden-path.json
test -f .doctrine/controls/public-controls.json
test -f docs/LAB_INTENT.md
test -f docs/DOCTRINE_COMPATIBILITY.md
test -f docs/DREPS_EXPORT.md
test -f docs/THREAT_MODEL.md
test -f docs/CLEAN_ROOM_MODE.md
test -f docs/OPEN_SOURCE_BOUNDARY.md
test -f scripts/dreps/export-dreps.mjs
test -f scripts/dreps/validate-dreps.mjs
test -f scripts/dreps/check-public-boundary.mjs
test -f scripts/export-dreps.sh

node scripts/dreps/check-public-boundary.mjs
node scripts/dreps/export-dreps.mjs --out examples/dreps --deterministic
node scripts/dreps/validate-dreps.mjs examples/dreps/evidence-pack.json

bash scripts/export-dreps.sh

echo ""
echo "============================================================"
echo "ICARE LAB VALIDATION PASS"
echo "============================================================"
