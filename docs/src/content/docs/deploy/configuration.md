---
title: Configuration reference
description: Every environment variable the Flagpost stack reads, what it does, and which ones you must set for production.
---

Configuration lives in `.env` (copied from `.env.example`), read by
`docker-compose.yml`. Defaults run a working local stack on
`http://localhost:8080` with no edits.

## Public origin & TLS

| Variable | Default | Meaning |
| --- | --- | --- |
| `HTTP_PORT` | `8080` | Host port the app is served on for local (non-domain) use. |
| `SITE_ADDRESS` | `:80` | Caddy's site address. Set to your **domain** (`ctf.example.com`) for automatic TLS issuance and renewal; the `:80` default means plain HTTP on the mapped port. |
| `PUBLIC_ORIGIN` | `http://localhost:8080` | The origin browsers use to reach the API — **baked into the frontend at build time** (`docker compose build`). Also becomes the backend's allowed CORS origin. |

## Database, cache, storage

| Variable | Default | Meaning |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `flagpost` / `flagpost` / `flagpost` | Postgres credentials; compose derives the backend's `DATABASE_URL` from them. |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | `minioadmin` / `minioadmin` | MinIO credentials; also used by the backend as its S3 access/secret keys. |
| `MINIO_PUBLIC_ENDPOINT` | `localhost:9000` | The host **browsers** hit for signed attachment downloads — must be reachable by competitors. See [Production deployment](/deploy/production/#attachments-and-minio_public_endpoint). |

## Auth

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | *(unset)* | Signing secret for access tokens. Unset, the app **derives a strong per-install secret and persists it** to the backend data volume (survives restarts). Set it explicitly for production, and always when running multiple backend hosts. |

## Demo mode

| Variable | Default | Meaning |
| --- | --- | --- |
| `DEMO_MODE` | *(unset)* | For **public demo instances only** (it's what runs demo.flagpost.io). Seeds well-known accounts (`admin` / `judge` / `participant`, password `password`) and a sample competition, shows a "resets hourly" banner and a credentials card on the login page, and disables the outbound automation actions (`webhook`, `send_email`). |

:::danger[Never enable on a real deployment]
Demo mode seeds publicly-known credentials. The hourly reset is external —
recreate the stack on a schedule (`docker compose down -v && docker compose up -d`).
:::

## Set inside the app, not the environment

- **SMTP** (host, port, credentials, sender) — configured at Admin → Site
  settings and stored in the database, with environment variables as a
  fallback. Powers automation emails and password resets.
- **Registration policy, branding, palettes** — all
  [site settings](/admin/site-settings/).

## Variables the compose file manages for you

You'll see these on the backend service; they're derived and rarely need
touching directly: `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`,
`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `CORS_ORIGINS`, `JWT_SECRET_FILE`.
Running [without Docker](/deploy/without-docker/), you set them yourself.
