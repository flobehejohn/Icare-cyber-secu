#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

TS="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_DIR="${1:-audit/_latest/icare-lab-audit-$TS}"
mkdir -p "$OUT_DIR"

echo "============================================================"
echo "[ICARE] Local lab audit"
echo "============================================================"

{
  echo "# Icare Local Lab Audit"
  echo ""
  echo "- timestampUtc: $TS"
  echo "- commit: $(git rev-parse HEAD)"
  echo "- branch: $(git rev-parse --abbrev-ref HEAD)"
  echo ""
} > "$OUT_DIR/audit.md"

if [ -f Makefile ]; then
  {
    echo "## Makefile"
    echo ""
    echo '```text'
    make -n || true
    echo '```'
  } >> "$OUT_DIR/audit.md"
fi

if [ -f CMakeLists.txt ]; then
  {
    echo "## CMake"
    echo ""
    echo "CMakeLists.txt detected."
  } >> "$OUT_DIR/audit.md"
fi

bash scripts/export-dreps.sh "$OUT_DIR/dreps"

find "$OUT_DIR" -type f | sort | xargs sha256sum > "$OUT_DIR/icare-lab-audit.SHA256SUMS"

cat > "$OUT_DIR/summary.json" <<SUMMARY
{
  "kind": "icare-local-lab-audit",
  "timestampUtc": "$TS",
  "status": "PASS",
  "outDir": "$OUT_DIR",
  "dreps": "$OUT_DIR/dreps/summary.json",
  "report": "$OUT_DIR/audit.md",
  "checksums": "$OUT_DIR/icare-lab-audit.SHA256SUMS"
}
SUMMARY

cat "$OUT_DIR/summary.json"

echo ""
echo "============================================================"
echo "ICARE LOCAL LAB AUDIT PASS"
echo "============================================================"
