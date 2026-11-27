#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
compose=(docker compose -f docker-compose.yml -p villadent-e2e)

cleanup() {
    local status=$?
    trap - EXIT
    "${compose[@]}" down -v || {
        if (( status == 0 )); then
            status=1
        fi
    }
    exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" up -d --build --wait
E2E_BASE_URL=http://localhost:4291 E2E_API_URL=http://localhost:8091 \
    pnpm --dir ../frontend e2e
