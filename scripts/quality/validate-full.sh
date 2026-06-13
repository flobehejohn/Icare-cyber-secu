#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${OUT_DIR:-audit/_latest/$TS}"
mkdir -p "$OUT_DIR"

log() {
  printf '[ICARE-CYBER-LAB][%s] %s\n' "$(date -u +%H:%M:%S)" "$*"
}

run_step() {
  local name="$1"
  shift
  log "START $name"
  {
    echo "### $name"
    echo "Command: $*"
    "$@"
  } >"$OUT_DIR/$name.log" 2>&1
  log "OK $name"
}

log "Audit directory: $OUT_DIR"

{
  echo "project=Icare-cyber-secu"
  echo "timestamp_utc=$TS"
  echo "root=$ROOT"
  uname -a || true
  cc --version | head -1 || true
  /usr/bin/make --version | head -1 || true
  git rev-parse --short HEAD 2>/dev/null || true
} > "$OUT_DIR/env.txt"

run_step deps bash -lc 'test -f /usr/include/readline/readline.h && command -v cc && command -v /usr/bin/make'
run_step clean /usr/bin/make clean
run_step build /usr/bin/make all
run_step smoke bash -lc "cat tests/smoke.icare | ./icare -n ci -t"

run_step negative bash -lc '
out="$(cat tests/negative.icare | ./icare -n ci -t 2>&1)"
echo "$out"
echo "$out" | grep -q "commande_inconnue"
count="$(echo "$out" | grep -c "Au revoir")"
test "$count" -eq 1
'

sha256sum Makefile icare.c gescom.c gescom.h scripts/quality/validate-full.sh > "$OUT_DIR/sha256sums.txt"

cat > "$OUT_DIR/summary.json" <<JSON
{
  "project": "Icare-cyber-secu",
  "timestamp_utc": "$TS",
  "status": "PASS",
  "validated_steps": ["deps", "clean", "build", "smoke", "negative"],
  "manual_steps": ["beui2 UDP capture", "controlled local packet injection"],
  "scope": "local cybersecurity laboratory"
}
JSON

cat > "$OUT_DIR/summary.txt" <<TXT
ICARE CYBER LAB VALIDATION
==========================

Status: PASS
Timestamp UTC: $TS

Validated:
- dependencies
- clean build
- smoke test
- negative command test
- checksums

Manual:
- beui2 UDP capture
- fake packet injection on 127.0.0.1 or explicitly authorized LAN
TXT

log "VALIDATION PASS: $OUT_DIR"
