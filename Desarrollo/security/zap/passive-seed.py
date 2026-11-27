"""Seed the passive analyzer with known, read-only local API routes."""


def zap_started(zap, target):
    origin = "http://127.0.0.1:8092"
    if target != origin + "/actuator/health":
        return
    for path in (
        "/actuator/health",
        "/api/v1/public/dentists",
        "/api/v1/public/procedures",
        "/api/v1/appointments?date=2025-06-01",
        "/api/v1/reports?from=2025-01-01&to=2025-12-31",
    ):
        zap.core.access_url(origin + path, followredirects=False)
