---
title: Stack architecture
description: What each service in the Flagpost stack does, how traffic flows through Caddy on a single origin, and why the backend is one process.
---

```
                       ┌──────────────────────────┐
   browser ──HTTPS──▶  │  caddy  (:80 / :443)     │
                       └────┬──────────────┬──────┘
                   /api/* , /ws/*      everything else
                            │              │
                    ┌───────▼──────┐  ┌────▼─────────┐
                    │   backend    │  │   frontend   │
                    │ FastAPI + WS │  │   Next.js    │
                    └─┬─────┬────┬─┘  └──────────────┘
                      │     │    │
              ┌───────▼─┐ ┌─▼───┐ ┌▼──────┐
              │postgres │ │redis│ │ minio │◀── signed URLs, direct
              └─────────┘ └─────┘ └───────┘    from the browser
```

## The single origin

Caddy fronts everything on **one public origin**: `/api/*` and `/ws/*`
proxy to the backend (WebSocket upgrades included), everything else to the
frontend. Same-origin means no CORS configuration, first-party auth cookies,
and WS connections that just work. Caddy also applies the app's security
headers (HSTS, `nosniff`, frame options, referrer policy, CSP) and gzip.

With `SITE_ADDRESS` set to a domain, Caddy obtains and renews TLS
certificates automatically.

## The services

| Service | Image | Role |
| --- | --- | --- |
| `caddy` | `caddy:2-alpine` | Reverse proxy, TLS, security headers |
| `frontend` | built from `frontend/` | Next.js app (internal-only, `:3000`) |
| `backend` | built from `backend/` | FastAPI REST + WebSockets + event bus + automation engine; runs `alembic upgrade head` before serving |
| `postgres` | `postgres:16-alpine` | All persistent data |
| `redis` | `redis:7-alpine` | Cache / pub-sub transport |
| `minio` | `minio/minio` | S3-compatible attachment storage (`:9000` published for signed downloads) |

Every stateful service has a named volume (`postgres-data`, `minio-data`,
`backend-data` for the derived JWT secret, Caddy's cert storage), and every
service has a healthcheck — Caddy won't route to the backend until
migrations have applied and `/api/health` answers.

## Why the backend is one process

WebSocket rooms (scoreboard, presence, tickets, notifications, collab
relays) and the async event bus live **in-process**
([ADR-0005](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0005-async-event-bus.md),
refined by ADR-0012). That trade keeps the platform a one-command deploy
with no message-broker choreography — at the cost of horizontal backend
scaling, which typical CTF workloads don't need. Scale up, not out; see
[Production deployment](/deploy/production/#scaling-expectations).

Event dispatch runs on two lanes: **synchronous** handlers (the audit log,
WebSocket broadcasts) complete before the request returns; **background**
handlers (automation actions like webhooks and email) are fire-and-forget so
a slow external call never blocks a competitor's submission.
