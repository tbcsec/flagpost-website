---
title: Production deployment
description: Take the default Docker Compose stack to a real domain — TLS, secrets, attachments, upgrades, and scaling expectations.
---

The default `docker compose up` **is** the production stack: built images
behind Caddy, with PostgreSQL, Redis, and MinIO. Going live is mostly
configuration.

## 1. Configure `.env`

```bash
cp .env.example .env
```

Set at minimum:

| Variable | Set it to |
| --- | --- |
| `SITE_ADDRESS` | Your domain, e.g. `ctf.example.com`. Caddy obtains and renews TLS **automatically** once ports 80/443 are reachable. |
| `PUBLIC_ORIGIN` | The browser-facing origin, e.g. `https://ctf.example.com`. **Baked into the frontend at build time** — set it before building. |
| `JWT_SECRET` | A long random value. (Left unset, the app derives a strong per-install secret and persists it — fine for a single host, but set it explicitly for production and always for multi-host.) |
| `POSTGRES_PASSWORD` | A real password. |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Real credentials. |
| `MINIO_PUBLIC_ENDPOINT` | A browser-reachable MinIO host for signed attachment downloads (see below). |

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

## Attachments and `MINIO_PUBLIC_ENDPOINT`

Challenge files download via **pre-signed URLs directly from MinIO**, so the
browser must be able to reach the MinIO S3 port. The compose file publishes
it on host port `9000`; point `MINIO_PUBLIC_ENDPOINT` at a host:port that
resolves for your competitors (e.g. `files.example.com:9000`, or front MinIO
with its own TLS proxy). If competitors can't download attachments, this
variable is almost always why.

## Upgrades

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on start. Take a
[platform export](/admin/backup/) and a `pg_dump` first — cheap insurance.

## Scaling expectations

The backend runs as a **single process by design**: the WebSocket and
event-bus layers are in-process, which is what keeps the stack a one-command
deploy. Scale **vertically** (more CPU/RAM) rather than adding backend
replicas. A single decent VM comfortably runs typical CTFs; for very large
events, rehearse with realistic load first.

## Health and monitoring

`GET /api/health` returns 200 when the app is up (the same check the compose
healthcheck and Caddy's start-up gating use) — point your uptime monitoring
at it through the front door: `https://ctf.example.com/api/health`.
