# Run Villadent end-to-end tests

From the repository root, run `./Desarrollo/e2e/run.sh` with Docker Compose,
pnpm, and the frontend's Playwright dependencies and Chromium installed.
The script waits for the isolated stack, runs the frontend's `e2e` script,
and tears down the stack even when tests fail.

| Service | Local port |
| --- | --- |
| Frontend (proxies `/api` to the E2E API) | 4291 |
| API | 8091 |
| PostgreSQL 17 (in-memory filesystem) | 5446 |

The stack starts with the `demo,e2e` Spring profiles. The `e2e` profile
replaces WhatsApp delivery with an in-memory sender and enables unauthenticated
`POST /api/v1/e2e/appointments/{id}/manage-link` for active, future appointments.
**Never enable the `e2e` profile in production or against a real database.**

## Run a second stack without touching Playwright

From the repository root, start the performance stack in a separate Compose
project. The host port overrides also update the generated manage-link URL.

```bash
export E2E_API_PORT=8092 E2E_DB_PORT=5447 E2E_WEB_PORT=4292
docker compose -f Desarrollo/e2e/docker-compose.yml -p villadent-perf up -d --build --wait
# Run the checks in ../perf or ../security/zap from the repository root.
docker compose -f Desarrollo/e2e/docker-compose.yml -p villadent-perf down -v
```

Use these overrides for manual Compose invocations, not the Playwright runner,
which continues to target the default ports. See the [performance runner](../perf/README.md).
