#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

TS="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_DIR="${1:-audit/_latest/icare-dreps-$TS}"

echo "============================================================"
echo "[ICARE] DREPS export"
echo "============================================================"
echo "[INFO] out_dir: $OUT_DIR"

node scripts/dreps/export-dreps.mjs --out "$OUT_DIR"
node scripts/dreps/validate-dreps.mjs "$OUT_DIR/evidence-pack.json"

echo ""
echo "============================================================"
echo "ICARE DREPS EXPORT PASS"
echo "============================================================"
