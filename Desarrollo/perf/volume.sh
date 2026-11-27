#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/Desarrollo/perf/stack.sh"
api=http://127.0.0.1:8092/api/v1
db < "$root/Desarrollo/perf/rnf04-05-volume.sql"
rows=$(db -Atc "SELECT count(*) FROM citas WHERE codigo LIKE 'VOL-%'")
day=$(db -Atc "SELECT count(*) FROM citas WHERE codigo LIKE 'VOL-%' AND fecha = '2025-06-01'")
[[ $rows == 4000 && $day == 15 ]]
token=$(curl --noproxy '*' -fsS -H 'Content-Type: application/json' \
  -d '{"email":"ana@villadent.co","password":"villadent2024"}' "$api/auth/login" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
status=0
{
  printf 'seed_rows=%s\nseed_agenda_rows=%s\n' "$rows" "$day"
  for path in 'appointments?date=2025-06-01' 'reports?from=2025-01-01&to=2025-12-31'; do
    result=$(curl --noproxy '*' -sS --max-time 30 -w $'\n%{http_code} %{time_total}' \
      -H "Authorization: Bearer $token" "$api/$path") || status=1
    read -r http seconds <<< "${result##*$'\n'}"
    if [[ $path == appointments* ]]; then
      expression='len(payload)'
      expected=15
    else
      expression='payload["total"]'
      expected=4000
    fi
    observed=$(python3 -c "import json,sys; payload = json.load(sys.stdin); print($expression)" \
      <<< "${result%$'\n'*}") || status=1
    printf '%s HTTP=%s seconds=%s records=%s\n' "$path" "$http" "$seconds" "$observed"
    [[ $http == 200 && $observed == "$expected" ]] &&
      LC_ALL=C awk -v t="$seconds" 'BEGIN { exit !(t < 2) }' || status=1
  done
} > "$evidence/rnf04-05-volume.txt"
cat "$evidence/rnf04-05-volume.txt"
exit "$status"
