"""Seed the active scan with the API routes of the isolated test stack.

ZAP's active scanner only attacks requests it has seen, and the API has no
OpenAPI document, so the public and staff GET routes are visited here. The
staff routes carry the demo auxiliar's token through the replacer rule that
active.sh configures.
"""


def zap_started(zap, target):
    origin = "http://127.0.0.1:8092"
    if not target.startswith(origin):
        return
    for path in (
        "/actuator/health",
        "/api/v1/public/dentists",
        "/api/v1/public/procedures",
        "/api/v1/public/availability?dentistId=1&procedureId=1&date=2026-12-01",
        "/api/v1/public/appointments/manage/not-a-real-token",
        "/api/v1/appointments?date=2026-12-01",
        "/api/v1/reports?from=2026-11-01&to=2026-11-30",
        "/api/v1/reports/history",
        "/api/v1/dentists",
    ):
        zap.core.access_url(origin + path, followredirects=False)
