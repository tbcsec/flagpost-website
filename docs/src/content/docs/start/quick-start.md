---
title: Quick start
description: Get a full Flagpost stack running locally in three commands, then create your owner account with the first-run setup wizard.
---

The default Docker Compose stack **is** the production stack: built images
behind a Caddy reverse proxy, with PostgreSQL, Redis, and MinIO. It runs
as-is on a laptop with no configuration.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin.
- Around 2 GB of free RAM for the five services.

## Run it

```bash
git clone https://github.com/tbcsec/flagpost.git
cd flagpost
docker compose up --build
```

The first boot builds the images, applies database migrations, and seeds the
built-in roles. Caddy waits for the backend's health check before routing to
it, so the app is ready when it answers.

Open **http://localhost:8080**.

## Complete the setup wizard

A fresh install ships with **no administrator and no default password** — it
is unconfigured until you complete the one-time setup wizard, which creates
your owner (Administrator) account and initial branding. Public registration
stays blocked until an owner exists.

See [First-run setup](/admin/setup/) for details.

## What you just started

| Service | Role |
| --- | --- |
| `caddy` | Single public origin on port 8080; proxies `/api` and `/ws` to the backend, everything else to the frontend |
| `frontend` | The Next.js app (internal only) |
| `backend` | FastAPI + WebSockets; runs `alembic upgrade head` before serving |
| `postgres` | The database |
| `redis` | Cache / pub-sub transport |
| `minio` | S3-compatible storage for challenge attachments |

## Next steps

- [Create your first competition](/guides/competitions/) and
  [author challenges](/guides/challenges/).
- Going public? Set your domain and real credentials —
  [Production deployment](/deploy/production/).
- Prefer hot-reloading dev servers? See
  [Local development](/dev/local/) for the dev stack.
