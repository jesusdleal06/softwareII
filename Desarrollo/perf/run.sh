#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/Desarrollo/perf/stack.sh"
case "${1:-}" in
  steady) stem=rnf04-02-steady ;;
  ramp) stem=rnf04-03-ramp ;;
  burst) stem=rnf04-04-reminder-burst ;;
  volume) exec "$root/Desarrollo/perf/volume.sh" ;;
  soak) stem=rnf04-06-soak ;;
  *) echo "Usage: $0 {steady|ramp|burst|volume|soak}" >&2; exit 2 ;;
esac
mkdir -p "$evidence"
curl --noproxy '*' -fsS http://127.0.0.1:8092/actuator/health >/dev/null
db -Atc 'SELECT current_database()' | grep -qx villadent_e2e
args=()
if [[ $1 == soak ]]; then
  container=$("${compose[@]}" ps -q api)
  [[ -n $container ]]
  "$root/Desarrollo/perf/sample-memory.sh" "$container" "$evidence/$stem-memory.csv" &
  sampler=$!
  trap 'kill "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  args=(-e "SOAK_DURATION=${SOAK_DURATION:-2h}")
fi
status=0
docker run --rm --network host --user "$(id -u):$(id -g)" \
  -v "$root/Desarrollo/perf:/scripts:ro" -v "$evidence:/evidence" \
  grafana/k6 run "${args[@]}" "/scripts/$stem.js" || status=$?
if [[ $1 == ramp ]]; then
  "$root/Desarrollo/perf/check-ramp.sh" "$evidence" || status=1
fi
if [[ $1 == soak && $status == 0 ]]; then
  python3 - "$evidence/$stem.json" <<'CHECK' || status=1
import json
import sys

with open(sys.argv[1]) as report:
    details = json.load(report)["details"]
if details["full_test"] and details["latency_pass"] is not True:
    sys.exit("Final 10-minute p95 exceeded 120% of the initial p95 or samples are missing.")
CHECK
fi
exit "$status"
