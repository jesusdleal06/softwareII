#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 || $# -gt 2 || ! $1 =~ ^https?:// || ! ${2:-300} =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 URL [interval_seconds]" >&2
  exit 2
fi
url=$1 interval=${2:-300} csv=${HEALTH_CSV:-health.csv}
export TZ=America/Bogota
[[ -s $csv ]] || printf 'timestamp,http_status,latency_seconds,observed_recovery_seconds\n' > "$csv"

failure='' previous_shift=''
while true; do
  started=$SECONDS
  read -r weekday hour day timestamp epoch <<< "$(date '+%u %H %F %FT%T%:z %s')"
  hour=$((10#$hour))
  if (( weekday <= 6 && ((hour >= 8 && hour < 12) || (hour >= 14 && hour < 18)) )); then
    shift="$day:$((hour >= 14))"
    if [[ $shift != "$previous_shift" ]]; then failure=''; fi
    previous_shift=$shift
    result=$(curl --disable --silent --output /dev/null --write-out '%{http_code} %{time_total}' \
      --connect-timeout 5 --max-time 15 -- "$url") || result="000 ${result#* }"
    read -r status latency <<< "$result"
    recovery=''
    if [[ $status == 200 ]]; then
      if [[ -n $failure ]]; then recovery=$(( $(date +%s) - failure )); fi
      failure=''
    elif [[ -z $failure ]]; then
      failure=$epoch
    fi
    printf '%s,%s,%s,%s\n' "$timestamp" "$status" "$latency" "$recovery" >> "$csv"
  fi
  remaining=$(( interval - (SECONDS - started) ))
  (( remaining > 0 )) || remaining=0
  sleep "$remaining"
done
