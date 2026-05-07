# Observability Runbook

## SLO Targets (Initial)

- Socket availability: `>= 99.5%` monthly.
- Room join success rate: `>= 99.0%` rolling 1h.
- Event processing p95: `< 250ms` rolling 15m.

## Dashboard Panels

1. Traffic and Latency
   - `sum(rate(socket_connections_total[5m]))`
   - `histogram_quantile(0.95, sum(rate(event_processing_duration_ms_bucket[5m])) by (le))`

2. Realtime Health
   - `socket_active_connections`
   - `sum(rate(socket_reconnects_total[5m]))`
   - `sum(rate(room_join_failures_total[5m])) by (reason)`

3. Dependency Health
   - `sum(rate(redis_errors_total[5m])) by (operation)`
   - `histogram_quantile(0.95, sum(rate(redis_op_duration_ms_bucket[5m])) by (le, operation))`

## Alert Rules (Initial)

1. Reconnect spike
   - Condition: `sum(rate(socket_reconnects_total[5m])) > 5`
   - For: `10m`
   - Severity: warning

2. Room join failures high
   - Condition: `sum(rate(room_join_failures_total[10m])) > 2`
   - For: `10m`
   - Severity: critical

3. Event latency regression
   - Condition: `p95(event_processing_duration_ms) > 400ms`
   - For: `15m`
   - Severity: warning

4. Redis failure sustained
   - Condition: `sum(rate(redis_errors_total[5m])) > 1`
   - For: `10m`
   - Severity: critical

## Triage Steps

1. Find failing alert panel and affected time window.
2. In Loki, query by `service` + `error_code` + `event_name`.
3. Pick a `trace_id` and inspect Tempo trace.
4. Check if issue is:
   - auth failures
   - room membership/validation
   - Redis latency/errors
   - DB latency/errors
5. Mitigate:
   - restart socket service if degraded
   - roll back latest deploy
   - disable noisy/expensive flows via feature flag if needed

## Deployment Verification Checklist

- `/health` returns 200.
- `/metrics` returns Prometheus text.
- New traces visible in Tempo within 2-3 minutes.
- Logs visible in Loki with `request_id` + `trace_id`.
- Alerts configured and test-notified once.
