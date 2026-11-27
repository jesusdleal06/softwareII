# Run the isolated performance cases

Use Bash, Docker with Compose, curl, and Python 3 on a Linux host. k6 runs in
Docker with host networking. These commands target only the test stack on
8092/5447/4292. Start with a fresh database: the booking cases reserve
deterministic, nonoverlapping date ranges and should not be repeated on the
same database. Do not run load cases concurrently.

From the repository root:

```bash
(
  set -e
  export E2E_API_PORT=8092 E2E_DB_PORT=5447 E2E_WEB_PORT=4292
  compose=(docker compose -f Desarrollo/e2e/docker-compose.yml -p villadent-perf)
  trap '"${compose[@]}" down -v' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  "${compose[@]}" up -d --build --wait
  Desarrollo/perf/run.sh steady
)
```

Replace the last line with the case to run:

| Case | Argument | Evidence |
| --- | --- | --- |
| CP-RNF04-02 | `steady` | 20 users, 10 min; availability and 201 bookings; zero failures, p95 < 2 s. |
| CP-RNF04-03 | `ramp` | 20→200 users over 5 min; first 10-second bucket with p95 > 2 s; 1 min of low-traffic cooldown and an HTTP 200 probe < 2 s at minute 6; reconcile all run-specific 201s with PostgreSQL and check duplicate slots. |
| CP-RNF04-04 | `burst` | 45 unique links prepared outside the measured scenario; one UI page GET, API view and API confirmation per user. |
| CP-RNF04-05 | `volume` | 4,000 rows in 2025, in groups of 15 on populated days (last group 10); time the day agenda and annual report as the demo assistant. |
| CP-RNF04-06 | `soak` | Five users, 2 h by default; p95 for each 10-minute window and container memory sampled each minute. |

The runner writes JSON/text summaries and supplemental evidence under
`Documentacion/pruebas/evidencias-no-funcionales/`. Copy or rename the existing
soak files before running the full soak if you also want to retain its smoke
evidence. For a short smoke only, use
`SOAK_DURATION=3m Desarrollo/perf/run.sh soak`. For the full case, run the
wrapper above with `SOAK_DURATION=2h Desarrollo/perf/run.sh soak`. Both begin
sampling memory immediately. Review the CSV for sustained growth or missing
samples; a successful runner exit alone does not verify memory stability.

An absent crossing does not prove a limit or demonstrate behavior beyond it.
The ramp runner exits nonzero in that case even if recovery and integrity pass.
Ramp ends admitting new iterations at 5 min; in-flight requests get at most
10 seconds to finish during cooldown.
