---
title: Observability & metrics
description: Flagpost's optional, gated Prometheus /metrics endpoint — how to enable it safely, the scrape config, the full metric catalogue, and the per-worker caveat.
---

Flagpost can expose an operational **`/metrics` endpoint** in
[Prometheus exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/).
It is **off by default**, gated, and — by design — exposes only
bounded-cardinality operational numbers (request counts and latencies,
event-bus depth, WebSocket occupancy, challenge-instance counts, database-pool
depth). It never carries competitor content or personal data. The design is
recorded in
[ADR-0037](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0037-metrics-endpoint-gating.md).

It is **kernel middleware plus one route**, not a per-competition module — so
there is no toggle in the competition UI; it's an install-level operator
setting.

## Enabling it safely

Three environment variables control it (see the
[configuration reference](/deploy/configuration/)):

| Variable | Default | Meaning |
| --- | --- | --- |
| `METRICS_ENABLED` | `false` | Master switch. While false, `/metrics` returns **404** — fully inert. |
| `METRICS_TOKEN` | *(empty)* | A static bearer token a scraper must present. |
| `METRICS_ALLOWED_IPS` | *(empty)* | Comma-separated IPs/CIDRs allowed to scrape (e.g. `10.0.0.0/8,127.0.0.1`). |

:::danger[Enabling without a gate refuses to start]
If `METRICS_ENABLED=true` and **both** `METRICS_TOKEN` and
`METRICS_ALLOWED_IPS` are empty, the backend **refuses to boot** — `/metrics`
must never be reachable unauthenticated. Set a token, an IP allowlist, or both.
:::

The scrape gate has **OR** semantics: a request is authorised if it presents a
matching bearer token **or** its client IP is in the allowlist. A scraper on a
trusted network needs no token; a token-holder can scrape from anywhere. An
enabled-but-unauthorised scrape gets `401` with `WWW-Authenticate: Bearer`; an
authorised one gets `200 text/plain`.

A minimal Prometheus
[`scrape_config`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
with a bearer token:

```yaml
scrape_configs:
  - job_name: flagpost
    metrics_path: /metrics
    scheme: https
    authorization:
      credentials: "your-METRICS_TOKEN-value"
    static_configs:
      - targets: ["flagpost.example.org"]
```

## What it exposes

All families are prefixed `flagpost_`. Labels are deliberately
**bounded-cardinality** — route *templates* (`/api/competitions/{competition_id}`),
never concrete paths with ids; status *classes* (`2xx`/`4xx`/`5xx`), never exact
codes; a fixed set of room types, instance states and catalogued event names.

| Metric | Type | Labels | What it tells you |
| --- | --- | --- | --- |
| `flagpost_http_requests_total` | counter | `method`, `route`, `status` | Request volume by matched route and status class |
| `flagpost_http_request_duration_seconds` | histogram | `method`, `route` | Request latency distribution |
| `flagpost_events_total` | counter | `event` | Every event emitted on the bus |
| `flagpost_event_emit_duration_seconds` | histogram | — | Foreground event-handler lane timing |
| `flagpost_event_background_inflight` | gauge | — | In-flight background handlers — the earliest saturation signal |
| `flagpost_challenge_instances` | gauge | `state` | Live [challenge instances](/deploy/challenge-instances/) by lifecycle state |
| `flagpost_instance_provision_errors_total` | counter | `reason` | Instance provisioning failures by cause |
| `flagpost_scheduler_last_run_timestamp_seconds` | gauge | — | Wall-clock of the last scheduler tick — staleness means a dead scheduler |
| `flagpost_scheduler_last_tick_duration_seconds` | gauge | — | How long the last scheduler tick took |
| `flagpost_ws_connections` | gauge | `room_type` | Live WebSocket connections by room type |
| `flagpost_ws_rooms` | gauge | `room_type` | Open rooms by room type |
| `flagpost_ws_presence_members` | gauge | `room_type` | Distinct presence members by room type |
| `flagpost_realtime_relay_attached` | gauge | — | `1` when the cross-worker broadcast relay is attached |
| `flagpost_db_pool_connections` | gauge | `state` | Connection-pool depth (`in_use`, `overflow`) |

A few notes that save confusion:

- **`flagpost_db_pool_connections` is Postgres-only.** On SQLite the collector
  emits no pool samples.
- **`flagpost_events_total` counts every emit** even when no handler matched;
  `flagpost_event_emit_duration_seconds` times only the foreground lane, not
  background handlers.
- The two scheduler gauges use different clocks — `last_run_timestamp_seconds`
  is wall-clock (for staleness alerts), `last_tick_duration_seconds` is a
  monotonic delta (for duration).

## The per-worker caveat

Each worker process keeps its **own in-process registry** (ADR-0037 §4), so a
single scrape hits one worker and reports that worker's numbers. On a
single-worker deployment that's exact. On a
[multi-worker](/deploy/scaling/) deployment — including
[ECS Fargate](/deploy/fargate/) with more than one task — either scrape each
worker/task individually (behind the load balancer, target the instances
directly) or accept a single-worker view. Flagpost ships no multiprocess
aggregator.

## Privacy stance

`/metrics` is an **inbound pull** surface: Flagpost sends nothing anywhere — a
scraper you run reads operational numbers from it. It is *not* telemetry and
*not* a new outbound dependency. Labels are bounded and carry no competitor
identifiers, submissions, flags, or message content. See
[`PRIVACY.md`](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md) and the
[security notes](/deploy/security/).
