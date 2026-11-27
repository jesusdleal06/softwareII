#!/usr/bin/env bash
set -euo pipefail
awk -F, '
  NR == 1 && $1 == "timestamp" { next }
  $2 ~ /^[0-9][0-9][0-9]$/ { total++; if ($2 == "200") up++ }
  END {
    if (!total) { print "No health samples"; exit 1 }
    printf "Availability: %.2f%% (%d/%d samples HTTP 200)\n", up * 100 / total, up, total
  }
' "${1:-health.csv}"
