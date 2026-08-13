---
title: Scaling for large events
description: How Flagpost scales — single process by default, opt-in multi-worker on one host since v1.4.0, with published load-test numbers and the tuning knobs.
---

Flagpost scales **one box, up then out**: a single backend process is the
default and handles typical CTFs; since **v1.4.0** a busy event on a
multi-core host can opt into **multiple worker processes on the same
machine**. Multi-machine (horizontal) replicas remain unsupported.

## When to go multi-worker

The signature that says the *event loop* is the bottleneck: **one core
pinned while the others idle**, connection resets or 502s despite DB-pool
and CPU headroom. From the project's published load tests
([docs/load-testing](https://github.com/tbcsec/flagpost/tree/main/docs/load-testing)
— re-run on your own hardware before a big event):

- A **single worker** on 4 vCPU / 4 GB held **200 concurrent users**
  comfortably, but shed **~45% of steady-state requests as 502s at 500
  users** — with DB and CPU headroom left. That's the event-loop ceiling.
- At **1,500 users**, the 4-worker A/B took steady-state 502s from
  30–45% **to 0%** and flag-submit p50 from ~1.9 s **to 14 ms**.
- Multi-worker does **not** help a fully CPU-saturated box — which is why
  the default stays 1 worker.

## Enabling it

**Under Docker (compose):** one line —

```bash
# .env
WEB_CONCURRENCY=4
```

The entrypoint migrates once before any worker serves, starts the workers,
and runs the **scheduler sidecar** as a single extra process so
time-triggered automations, the daily update check, and retention fire
once — not N times. Redis is already in the stack, and the compose file
already raises Postgres to `max_connections=200` for pool headroom.

**Without Docker:** three things are mandatory —

1. `export WEB_CONCURRENCY=N` **and** pass the same N to
   `uvicorn --workers N`. The **env var is what the app reads**: with
   `--workers 4` but `WEB_CONCURRENCY` unset, no cross-worker relay
   attaches — broadcasts reach only each socket's own worker, presence
   fragments, and the scheduler fires in every worker.
2. `REDIS_URL` must be set — multi-worker **refuses to boot** without it,
   loudly, at startup.
3. Run the singleton scheduler as its own process with the same
   environment: `.venv/bin/python -m scheduler` (from `backend/`). Under
   multi-worker the web workers deliberately skip the in-process
   scheduler.

Size Postgres to match: each worker's pool is
`DB_CONNECTION_BUDGET // N` (+ half that as overflow), so keep the budget
under your `max_connections`.

## What changes under multi-worker

- **Redis becomes mandatory** — WebSocket broadcast frames are relayed
  across workers over a single Redis pub/sub channel behind the
  connection manager
  ([ADR-0025](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0025-multi-worker-broadcast-relay.md)),
  and presence becomes a Redis liveness view with per-worker heartbeats —
  a crashed worker's members age out within the TTL
  ([ADR-0026](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0026-cross-worker-presence.md)).
- **The event bus stays per-worker** — each event's handlers run once, on
  the emitting worker, so webhooks and emails never double-fire. Only the
  WebSocket fan-out crosses workers.
- **The DB pool becomes a budget** — a fixed connection budget is split
  across workers so N workers can't oversubscribe Postgres.
- **The scheduler runs once**, as a sidecar.

Single-worker attaches none of this and behaves exactly as before.

## Tuning knobs

All new in v1.4.0, read by the backend process directly (under compose,
add them to the backend service's environment — only `WEB_CONCURRENCY` is
plumbed through `.env` for you):

| Variable | Default | Meaning |
| --- | --- | --- |
| `WEB_CONCURRENCY` | `1` | Worker processes. `1` = single process, no Redis needed for realtime; `>1` = relay + presence via Redis, scheduler sidecar |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | `30` / `30` | Single-worker Postgres pool (60 total checkouts) |
| `DB_POOL_TIMEOUT` | `30` | Seconds to wait for a free connection before failing fast |
| `DB_CONNECTION_BUDGET` | `100` | Multi-worker only: total steady connections, split `budget // workers` per worker (overflow half that). Keep under Postgres `max_connections` |
| `REDIS_MAX_CONNECTIONS` / `REDIS_ACQUIRE_TIMEOUT_SECONDS` | `50` / `10` | Per-component cap on the bounded Redis client pools — the rate limiter, relay, and presence store each hold their own pool at this size (so budget up to ~3× per worker for Redis `maxclients`); bursts queue instead of erroring |
| `WS_PRESENCE_TTL_SECONDS` / `WS_PRESENCE_HEARTBEAT_SECONDS` | `30` / `10` | Presence liveness window; TTL must exceed heartbeat + grace |
| `WS_HANDSHAKE_RATE_LIMIT` / `WS_HANDSHAKE_RATE_WINDOW_SECONDS` | `60` / `30` | Per-user WebSocket handshake rate limit — a reconnect herd can't recompute a snapshot per socket |
| `WS_SEND_TIMEOUT_SECONDS` | `5` | Per-socket send timeout; a stalled client is reaped instead of stalling its room |
| `SCOREBOARD_CACHE_TTL_SECONDS` | `5` | TTL backstop on the cached scoreboard read model (cleared on every board-moving event) |
| `ACTIVITY_COALESCE_WINDOW_SECONDS` | `0.5` | Server-side burst coalescing for activity pings |

## Doors-open logins

v1.4.0 also fixed the **login-storm** failure mode: argon2 hashing now
uses the OWASP server configuration (`p=1`, memory and time unchanged) and
runs on bounded pools, so a burst of first-time logins during onboarding
can't saturate CPU. In the published run this lifted doors-open onboarding
from 1,017 to 1,416 of 1,500 users, and login p50 from 3.9 s to 424 ms —
on a single worker. No operator action; existing hashes keep verifying.
