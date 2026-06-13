#!/usr/bin/env bash
set -Eeuo pipefail

IFACE="${1:-any}"
PORT="${PORT:-9999}"

echo "Capture UDP BEUI2 sur interface=$IFACE port=$PORT"
echo "Arrêt: Ctrl+C"
sudo tcpdump -ni "$IFACE" "udp port $PORT" -A
