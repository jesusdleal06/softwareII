#!/usr/bin/env bash
# CP-RNF01-02 in WebKit (Safari's engine) on hosts whose system libraries cannot
# run Playwright's WebKit build (for example Arch Linux with a newer ICU): the
# WebKit projects run inside the official Playwright image, which ships them.
# Starts the isolated stack, runs the two WebKit projects and always tears down.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
frontend=$(cd "$here/../frontend" && pwd)
compose=(docker compose -f "$here/docker-compose.yml" -p villadent-e2e)
version=$(node -p "require('$frontend/package.json').devDependencies['@playwright/test']")

cleanup() { "${compose[@]}" down -v >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" up -d --build --wait
docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e CI=1 -e E2E_FORCE_WEBKIT=1 \
  -e E2E_BASE_URL=http://localhost:4291 -e E2E_API_URL=http://localhost:8091 \
  -v "$frontend:/work" -w /work "mcr.microsoft.com/playwright:v$version-noble" \
  npx playwright test e2e/rnf01-compatibility.spec.ts \
  --project=webkit-desktop --project=webkit-mobile --reporter=list --output=/tmp/pw-out
