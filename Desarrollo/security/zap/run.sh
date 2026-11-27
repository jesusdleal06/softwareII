#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
source "$root/Desarrollo/perf/stack.sh"
mkdir -p "$evidence"
db -Atc 'SELECT current_database()' | grep -qx villadent_e2e
status=0
for target in frontend api; do
  case "$target" in
    frontend) url=http://127.0.0.1:4292/ ;;
    api) url=http://127.0.0.1:8092/actuator/health ;;
  esac
  curl --noproxy '*' -fsS "$url" >/dev/null
  stem="rnf03-03-baseline-$target"
  result=0
  docker run --rm --network host --user "$(id -u):$(id -g)" \
    -v "$evidence:/zap/wrk:rw" -v "$root/Desarrollo/security/zap/passive-seed.py:/zap/passive-seed.py:ro" ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py --hook /zap/passive-seed.py -t "$url" -m 1 -r "$stem.html" -J "$stem.json" || result=$?
  if (( result != 0 )); then status=$result; fi
  test -s "$evidence/$stem.html" && test -s "$evidence/$stem.json" || exit 3
done
exit "$status"
