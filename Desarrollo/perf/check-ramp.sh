#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/Desarrollo/perf/stack.sh"
report="$1/rnf04-03-ramp-integrity.txt"
json="$1/rnf04-03-ramp.json"
created=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["metrics"]["bookings_created"]["values"]["count"])' "$json")
counts=$(db -Atc "
  SELECT
    (SELECT count(*) FROM citas c JOIN pacientes p USING (id_paciente)
     WHERE p.nombre_completo LIKE 'Synthetic 3 %'),
    (SELECT count(*) FROM (SELECT id_odontologo, fecha, hora
      FROM citas WHERE estado <> 'CANCELADA' GROUP BY 1,2,3 HAVING count(*) > 1) duplicates)
")
IFS='|' read -r rows duplicates <<< "$counts"
printf 'http_201=%s\nramp_rows=%s\nduplicate_slots=%s\n' "$created" "$rows" "$duplicates" | tee "$report"
[[ $created -gt 0 && $created == "$rows" && $duplicates == 0 ]] || exit 1
python3 - "$json" <<'CHECK'
import json
import sys

with open(sys.argv[1]) as report:
    crossing = json.load(report)["details"]["first_crossing_s"]
if crossing is None:
    sys.exit("The p95 never crossed 2 s at 20–200 VUs; the limit was not established.")
CHECK
