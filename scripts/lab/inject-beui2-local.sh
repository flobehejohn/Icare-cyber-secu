#!/usr/bin/env bash
set -Eeuo pipefail

TARGET="${1:-127.0.0.1}"
PORT="${2:-9999}"
PSEUDO="${3:-intruder_lab}"

case "$TARGET" in
  127.*|localhost)
    ;;
  *)
    echo "Refus: injection limitée par défaut à 127.0.0.1 / localhost."
    echo "N'utilise ce script sur un LAN que dans un environnement explicitement autorisé."
    exit 2
    ;;
esac

payload="2BEUI2${PSEUDO}"
echo "Envoi local contrôlé: $payload -> $TARGET:$PORT"

if command -v nc >/dev/null 2>&1; then
  printf '%s' "$payload" | nc -u -w1 "$TARGET" "$PORT"
else
  python3 - "$TARGET" "$PORT" "$payload" <<'PY'
import socket
import sys

target = sys.argv[1]
port = int(sys.argv[2])
payload = sys.argv[3].encode()

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(payload, (target, port))
sock.close()
PY
fi
