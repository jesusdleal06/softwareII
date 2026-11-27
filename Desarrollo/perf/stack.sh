# Source from a runner that sets root to the repository root.
export E2E_API_PORT=8092 E2E_DB_PORT=5447 E2E_WEB_PORT=4292
compose=(docker compose -f "$root/Desarrollo/e2e/docker-compose.yml" -p villadent-perf)
evidence="$root/Documentacion/pruebas/evidencias-no-funcionales"
db() {
  "${compose[@]}" exec -T postgres psql -X -v ON_ERROR_STOP=1 -U villadent -d villadent_e2e "$@"
}
