#!/usr/bin/env bash
# CP-RNF03-03: ZAP active scan (zap-full-scan.py) of the isolated test stack.
# Never point this at production: the active scan sends attack payloads.
# Start the second stack first (see ../../e2e/README.md), then run from the
# repository root. Reports go to Documentacion/pruebas/evidencias-no-funcionales.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
evidence="$root/Documentacion/pruebas/evidencias-no-funcionales"
api=http://127.0.0.1:8092
web=http://127.0.0.1:4292/

curl --noproxy '*' -fsS "$api/actuator/health" >/dev/null
curl --noproxy '*' -fsS "$web" >/dev/null

# Demo auxiliar of the throwaway database (fictitious credentials of the demo seed).
token=$(curl --noproxy '*' -fsS "$api/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ana@villadent.co","password":"villadent2024"}' |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

status=0
scan() {
  local stem=$1 url=$2; shift 2
  local result=0
  # ZAP's packaged scans add this header to every request to the API host.
  docker run --rm --network host --user "$(id -u):$(id -g)" \
    -e ZAP_AUTH_HEADER=Authorization -e "ZAP_AUTH_HEADER_VALUE=Bearer $token" \
    -e ZAP_AUTH_HEADER_SITE=127.0.0.1:8092 \
    -v "$evidence:/zap/wrk:rw" \
    -v "$root/Desarrollo/security/zap/active-seed.py:/zap/active-seed.py:ro" \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-full-scan.py -t "$url" -m 3 -T 40 -r "$stem.html" -J "$stem.json" "$@" || result=$?
  # zap-full-scan exits 1 on FAIL alerts and 2 on WARN alerts; read the report either way.
  if ((result > status)); then status=$result; fi
  test -s "$evidence/$stem.html" && test -s "$evidence/$stem.json" || exit 3
}

scan rnf03-03-active-frontend "$web"
scan rnf03-03-active-api "$api/actuator/health" --hook /zap/active-seed.py
exit "$status"
