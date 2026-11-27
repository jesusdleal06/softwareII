#!/usr/bin/env bash
set -euo pipefail
printf 'timestamp,usage\n' > "$2"
while true; do
  started=$SECONDS
  usage=$(docker stats --no-stream --format '{{.MemUsage}}' "$1") || usage=
  printf '%s,%s\n' "$(date -Is)" "${usage%% / *}" >> "$2"
  remaining=$(( 60 - (SECONDS - started) ))
  (( remaining > 0 )) || remaining=0
  sleep "$remaining" &
  wait $!
done
