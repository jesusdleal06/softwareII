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
