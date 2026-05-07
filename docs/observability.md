# Observability Setup

This project uses:

- Logs: structured JSON via app and socket `logger` modules.
- Traces: OpenTelemetry OTLP export (Tempo-compatible).
- Metrics: Prometheus endpoint from socket server (`/metrics`).

## 1) Environment Variables

Set these in both web runtime and socket runtime where applicable:

- `OBS_ENABLED=true`
- `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS` (for Grafana Cloud auth, `Authorization=Basic ...`)

Optional convenience aliases:

- `GRAFANA_OTLP_ENDPOINT`
- `GRAFANA_OTLP_AUTH`

Socket service (Render) also exposes:

- `GET /health`
- `GET /metrics`

## 2) Logs to Loki

The app emits structured logs with fields suited for Loki labels/queries:

- `service`, `env`, `version`
- `request_id`, `trace_id`, `span_id`
- `room_id`, `event_name`, `error_code`

Use Render/Vercel log drains or an agent (Promtail/Alloy) to ship stdout/stderr to Grafana Cloud Loki.

## 3) Traces to Tempo

Web:

- Next.js loads `instrumentation.ts`, initializes OTel SDK, and exports OTLP spans when endpoint is configured.
- API routes instrumented through `withApi`, plus outlier routes instrumented directly.

Socket server:

- `server/src/observability.ts` initializes OTel SDK at startup.
- high-value events are wrapped with tracing spans.

## 4) Metrics Endpoint

Prometheus metrics are exposed by socket server at `/metrics` via `prom-client`.

Key metrics:

- `socket_connections_total`
- `socket_reconnects_total`
- `socket_active_connections`
- `room_join_failures_total`
- `room_join_duration_ms`
- `event_processing_duration_ms`
- `redis_errors_total`
- `redis_op_duration_ms`
- `rooms_active`

## 5) Grafana Cloud Free Tier Integration

1. Create a hosted Prometheus scrape job in Grafana Cloud.
2. Target your Render socket URL: `https://<service>.onrender.com/metrics`.
3. Scrape every 15-30s.
4. Confirm metrics appear in Explore (Prometheus datasource).
5. Confirm logs appear in Loki datasource and traces in Tempo datasource.

## 6) Correlation Workflow

1. Start from an error log in Loki (`error_code`, `request_id`, `trace_id`).
2. Pivot to trace in Tempo using `trace_id`.
3. Inspect sibling spans (db/redis/socket events).
4. Confirm impact via metrics (`event_processing_duration_ms`, reconnect spikes, join failures).
