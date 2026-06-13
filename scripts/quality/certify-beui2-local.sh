#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "=== [1] Préparation build strict ==="
make clean
make CFLAGS="-Wall -Wextra -Wpedantic -Werror -std=gnu11 -g -O2"

command -v tcpdump >/dev/null || { echo "ERREUR: tcpdump manquant. sudo apt install -y tcpdump"; exit 1; }
command -v nc >/dev/null || { echo "ERREUR: nc manquant. sudo apt install -y netcat-openbsd"; exit 1; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
CERT_DIR="audit/_latest/beui2-$TS"
mkdir -p "$CERT_DIR"

echo "=== [2] Dossier preuve ==="
echo "$CERT_DIR"

echo "=== [3] Capture tcpdump UDP 9999 ==="
sudo timeout 10 tcpdump -ni any "udp port 9999" -A > "$CERT_DIR/tcpdump.log" 2>&1 &
TCPDUMP_PID=$!

sleep 1

echo "=== [4] Injection locale contrôlée ==="
(
  sleep 2
  bash scripts/lab/inject-beui2-local.sh 127.0.0.1 9999 bob_lab
) > "$CERT_DIR/inject.log" 2>&1 &
INJECT_PID=$!

echo "=== [5] Lancement Icare + BEUI2 ==="
{
  echo "beui2"
  sleep 1
  echo "beui2 on"
  sleep 4
  echo "beui2 liste"
  sleep 1
  echo "exit"
} | ./icare -n florian -t > "$CERT_DIR/icare.log" 2>&1 || true

wait "$INJECT_PID" || true
wait "$TCPDUMP_PID" || true

echo "=== [6] Validation preuves ==="

grep -q "BEUI2" "$CERT_DIR/tcpdump.log" || {
  echo "ERREUR: aucun paquet BEUI2 détecté dans tcpdump."
  cat "$CERT_DIR/tcpdump.log"
  exit 1
}

grep -Eq "bob_lab|Message Recu|Ajout" "$CERT_DIR/icare.log" || {
  echo "ERREUR: Icare n a pas reçu ou traité le paquet."
  cat "$CERT_DIR/icare.log"
  exit 1
}

printf "{\n  \"project\": \"Icare-cyber-secu\",\n  \"timestamp_utc\": \"%s\",\n  \"status\": \"PASS\",\n  \"validated_steps\": [\"strict_build\", \"udp_capture_tcpdump\", \"beui2_server_start\", \"controlled_local_packet_injection\", \"observable_beui2_packet\", \"icare_received_or_processed_packet\"],\n  \"scope\": \"127.0.0.1 local authorized lab only\"\n}\n" "$TS" > "$CERT_DIR/summary.json"

printf "ICARE BEUI2 NETWORK CERTIFICATION\n=================================\n\nStatus: PASS\nTimestamp UTC: %s\n\nValidated:\n- strict build\n- tcpdump capture on UDP port 9999\n- Icare beui2 server startup\n- controlled local injection\n- observable BEUI2 packet\n- Icare received or processed injected packet\n\nScope:\n- local authorized lab only\n- target: 127.0.0.1\n\nEvidence:\n- %s/icare.log\n- %s/inject.log\n- %s/tcpdump.log\n" "$TS" "$CERT_DIR" "$CERT_DIR" "$CERT_DIR" > "$CERT_DIR/summary.txt"

echo "=== CERTIFICATION BEUI2 PASS ==="
cat "$CERT_DIR/summary.txt"
