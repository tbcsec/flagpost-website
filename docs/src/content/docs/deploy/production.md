---
title: Production deployment
description: Take the default Docker Compose stack to a real domain — TLS, secrets, attachments, upgrades, and scaling expectations.
---

The default `docker compose up` **is** the production stack: built images
behind Caddy, with PostgreSQL, Redis, and RustFS. Going live is mostly
configuration.

## 1. Configure `.env`

```bash
cp .env.example .env
```

Set at minimum:

| Variable | Set it to |
| --- | --- |
| `SITE_ADDRESS` | Your domain, e.g. `ctf.example.com`. Caddy obtains and renews TLS **automatically** once ports 80/443 are reachable. |
| `PUBLIC_ORIGIN` | The browser-facing origin, e.g. `https://ctf.example.com`. Baked into the frontend at **source-build** time (release images are same-origin and don't need the rebuild), and it's what [OIDC redirect URIs](/admin/sso/) and [SAML ACS/metadata URLs](/admin/saml/) are built from — so it must be exact if you configure SSO. |
| `JWT_SECRET` | A long random value. (Left unset, the app derives a strong per-install secret and persists it — fine for a single host, but set it explicitly for production and always for multi-host.) |
| `POSTGRES_PASSWORD` | A real password — generate with `openssl rand -hex 24`. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Real credentials, same treatment. **The backend refuses to start** if it finds the object store's published defaults on a deployment that looks reachable (non-local `PUBLIC_ORIGIN`, or `S3_PUBLIC_ENDPOINT` set) — default credentials there mean world read/write on every attachment, outside RBAC entirely. |
| `S3_PUBLIC_ENDPOINT` | A browser-reachable object-storage host for signed attachment downloads (see below). |

To rotate the object-storage credentials, change `S3_ACCESS_KEY` /
`S3_SECRET_KEY` and run
`docker compose up -d --force-recreate rustfs backend`: RustFS reads the
pair from its environment on every start, so that *is* the rotation — the
old pair is rejected immediately, with nothing to reconfigure inside the
server.

Full variable semantics: [Configuration reference](/deploy/configuration/).

## 2. Open the ports

Map **80 and 443** to the Caddy service (the compose file already declares
them; your firewall/cloud rules must allow them). Caddy serves the app on
your domain with automatic HTTPS and redirects.

## 3. Build and start

```bash
docker compose up --build -d
```

On boot the backend applies migrations and seeds the built-in roles; Caddy
waits for its health check before routing traffic. Then open your domain and
run the [setup wizard](/admin/setup/).

## Attachments and `S3_PUBLIC_ENDPOINT`

Challenge files download via **pre-signed URLs directly from the object
store**, so the browser must be able to reach the RustFS S3 port. Since
v1.4.0 the compose binds it to **loopback** (`127.0.0.1:9000`) — right for
a single-host deploy where everything shares the box. If competitors must
reach RustFS on a different host, deliberately publish the port (a compose
override changing the binding to `9000:9000`, with real
`S3_ACCESS_KEY` / `S3_SECRET_KEY`) or front RustFS with its own TLS proxy,
and point `S3_PUBLIC_ENDPOINT` at the browser-reachable host:port (e.g.
`files.example.com:9000`) — a non-loopback value also activates the
default-credential boot guard. If competitors can't download attachments,
this variable is almost always why.

## Upgrades

Prefer **pinned release images** — every release publishes
`ghcr.io/tbcsec/flagpost-{backend,frontend}:vX.Y.Z`, so upgrading is a tag
bump instead of a source rebuild. Building from source (`git pull &&
docker compose build && docker compose up -d`) still works. Either way,
migrations run automatically on start; take a
[platform export](/admin/backup/) and a `pg_dump` first — cheap insurance.

The full story — image overrides, version reporting, release notes,
security advisories, and the update check — is on
[Releases & upgrades](/deploy/upgrades/).

## Scaling expectations

The backend runs as a single process **by default** (`WEB_CONCURRENCY=1`):
in-process WebSocket broadcast, no Redis needed for realtime, the
one-command deploy unchanged. A single decent VM comfortably runs typical
CTFs — in published load tests, one worker on 4 vCPU held ~200 concurrent
users.

Since **v1.4.0**, a busy event on a multi-core host can **scale out to
multiple worker processes on the same box**: set `WEB_CONCURRENCY>1` in
`.env` and the entrypoint starts that many workers, switches the
real-time layer to a Redis-backed cross-worker relay and presence store,
splits a fixed DB connection budget across workers, and runs the
time-trigger scheduler as a single sidecar. In the 1,500-user A/B, four
workers took steady-state 502s from 30–45% to 0%. Multi-machine replicas
remain unsupported. The full story — when it helps, how to enable it, and
the tuning knobs — is on [Scaling for large events](/deploy/scaling/);
for very large events, rehearse with realistic load first.

## Health and monitoring

`GET /api/health` returns 200 when the app is up (the same check the compose
healthcheck and Caddy's start-up gating use) — point your uptime monitoring
at it through the front door: `https://ctf.example.com/api/health`.
